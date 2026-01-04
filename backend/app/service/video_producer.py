import os
import subprocess
import shutil
import asyncio
import edge_tts
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from pdf2image import convert_from_path
from jinja2 import Template
from app.config import settings
from PIL import Image 

# LaTeX 特殊字符转义函数
def escape_latex(text):
    """转义 LaTeX 特殊字符"""
    # LaTeX 中需要转义的特殊字符
    replacements = {
        '\\': r'\textbackslash{}',
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
    }
    
    result = text
    for char, escaped in replacements.items():
        result = result.replace(char, escaped)
    
    return result

# --- LaTeX 模版配置 ---
# 使用简化的现代模板，避免复杂的 beamer 主题配置
LATEX_TEMPLATE = r"""
\documentclass[aspectratio=169,14pt]{beamer}
\usepackage{fontspec}
\usepackage{xeCJK}
\usepackage{graphicx}

% 禁用导航符号
\setbeamertemplate{navigation symbols}{}

% 字体配置
\setmainfont[
    Path = {{ font_dir }}/,
    BoldFont = Times-New-Roman-Bold.ttf,
    Extension = .ttf
]{Times-New-Roman}

\setCJKmainfont[
    Path = {{ font_dir }}/,
    BoldFont = NotoSerifSC-SemiBold.ttf,
    Extension = .ttf
]{NotoSerifSC-Regular}

% 定义配色
\definecolor{primaryblue}{RGB}{25, 25, 112}
\definecolor{accentorange}{RGB}{255, 140, 0}

% 设置标题样式
\setbeamercolor{frametitle}{bg=primaryblue,fg=white}
\setbeamerfont{frametitle}{size=\Large,series=\bfseries}

% 设置列表项颜色
\setbeamercolor{itemize item}{fg=accentorange}
\setbeamertemplate{itemize items}[circle]

% 添加圆角阴影框架
\setbeamertemplate{blocks}[rounded][shadow=true]

\begin{document}

\begin{frame}
    \frametitle{ {{ title }} }
    \begin{itemize}
        \setlength\itemsep{1.8em}
        {% for bullet in bullets %}
        \item \large {{ bullet }}
        {% endfor %}
    \end{itemize}
\end{frame}

\end{document}
"""

async def generate_audio(text, output_file, progress_callback=None, max_retries=3):
    """使用 Edge-TTS 生成语音文件，带重试机制"""
    text_preview = text[:30] + "..." if len(text) > 30 else text
    
    if progress_callback:
        progress_callback(f"🎤 生成语音: {text_preview}")
        
    for attempt in range(max_retries):
        try:
            if progress_callback and attempt > 0:
                progress_callback(f"🔄 语音生成重试 ({attempt + 1}/{max_retries}): {text_preview}")
                
            communicate = edge_tts.Communicate(text, "zh-CN-YunxiNeural")
            await communicate.save(output_file)
            print(f"[INFO] 音频生成成功: {output_file}")
            
            if progress_callback:
                progress_callback(f"✅ 语音完成: {text_preview}")
            return
            
        except Exception as e:
            wait_time = (attempt + 1) * 2  # 递增等待时间：2秒、4秒、6秒
            print(f"[WARN] 音频生成失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            
            if attempt < max_retries - 1:
                if progress_callback:
                    progress_callback(f"⚠️ 语音失败，{wait_time}秒后重试: {text_preview}")
                print(f"[INFO] {wait_time}秒后重试...")
                await asyncio.sleep(wait_time)
            else:
                print(f"[ERROR] 音频生成最终失败，已重试 {max_retries} 次")
                if progress_callback:
                    progress_callback(f"❌ 语音生成失败")
                raise Exception(f"Edge TTS 服务不可用，请稍后再试: {e}")

def compile_latex_slide(title, bullets, output_image_path, session_dir, progress_callback=None):
    """
    使用 XeLaTeX 编译幻灯片，支持自定义学术字体
    
    Args:
        title: 幻灯片标题
        bullets: 要点列表
        output_image_path: 输出图片路径
        session_dir: 会话目录
        progress_callback: 进度回调函数
    """
    if progress_callback:
        progress_callback(f"📝 准备编译幻灯片: {title[:20]}...")
    
    # 1. 准备字体路径
    font_dir = settings.FONTS_DIR
    
    # LaTeX 对路径要求比较严格：
    # 1. 必须以 / 结尾
    # 2. 必须是正斜杠 (即使在 Windows 上)
    if not font_dir.endswith("/"):
        font_dir += "/"
    font_dir = font_dir.replace("\\", "/")

    # 简单检查字体是否存在，方便调试
    required_fonts = [
        "Times-New-Roman.ttf", 
        "Times-New-Roman-Bold.ttf", 
        "NotoSerifSC-Regular.ttf", 
        "NotoSerifSC-SemiBold.ttf"
    ]
    for font in required_fonts:
        if not os.path.exists(os.path.join(settings.FONTS_DIR, font)):
            print(f"[WARNING] 字体文件缺失: {font} (在 {settings.FONTS_DIR})")

    # 2. 渲染模板
    if progress_callback:
        progress_callback(f"🎨 渲染 LaTeX 模板...")
    
    # 转义 LaTeX 特殊字符
    escaped_title = escape_latex(title)
    escaped_bullets = [escape_latex(bullet) for bullet in bullets]
        
    template = Template(LATEX_TEMPLATE)
    tex_content = template.render(
        title=escaped_title,
        bullets=escaped_bullets,
        font_dir=font_dir
    )

    # 3. 写入 .tex 文件
    tex_filename = "slide.tex"
    tex_path = os.path.join(session_dir, tex_filename)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)

    # 4. 调用 xelatex 编译
    if progress_callback:
        progress_callback(f"📝 正在编译 LaTeX: {title[:20]}...")
        
    # -interaction=nonstopmode 防止编译错误时卡住进程
    print(f"[INFO] 正在编译 LaTeX: {title[:20]}...")
    try:
        result = subprocess.run(
            ["xelatex", "-interaction=nonstopmode", tex_filename],
            cwd=session_dir, # 在临时目录下执行
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 检查是否有警告或错误
        if "Warning" in result.stdout:
            print(f"[WARNING] LaTeX 编译有警告")
        
        if progress_callback:
            progress_callback(f"✅ LaTeX 编译完成: {title[:20]}...")
            
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] LaTeX 编译失败: {e.stderr}")
        if progress_callback:
            progress_callback(f"❌ LaTeX 编译失败: {title[:20]}...")
        # 失败回退：生成一张纯色错误图片，防止程序崩溃
        Image.new('RGB', (1920, 1080), color=(200, 200, 200)).save(output_image_path)
        return

    # 5. 将生成的 PDF 转为 PNG
    if progress_callback:
        progress_callback(f"🖼️ 转换为图片: {title[:20]}...")
        
    pdf_path = os.path.join(session_dir, "slide.pdf")
    if os.path.exists(pdf_path):
        # dpi=200 约等于 1080p 分辨率
        images = convert_from_path(pdf_path, dpi=200) 
        if images:
            # 直接保存第一页
            images[0].save(output_image_path, "PNG")
            if progress_callback:
                progress_callback(f"✅ 图片生成: {title[:20]}...")
    else:
        print("[ERROR] PDF 文件未生成")
        if progress_callback:
            progress_callback(f"❌ PDF 转换失败: {title[:20]}...")
        # 生成空白图兜底
        Image.new('RGB', (1920, 1080), color=(255, 255, 255)).save(output_image_path)

async def render_final_video(script_data, session_id, progress_callback=None):
    """合成最终视频"""
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    clips = []
    slides = script_data.get("slides", [])

    try:
        total_slides = len(slides)
        print(f"[INFO] 开始渲染视频，共 {total_slides} 页...")
        
        if progress_callback:
            progress_callback(f"🎬 开始视频制作流程 (共 {total_slides} 页)")
        
        for idx, slide in enumerate(slides):
            slide_num = idx + 1
            if progress_callback:
                progress_callback(f"📄 处理第 {slide_num}/{total_slides} 页: {slide['title'][:30]}...")
            
            img_path = os.path.join(session_dir, f"slide_{idx}.png")
            audio_path = os.path.join(session_dir, f"audio_{idx}.mp3")
            
            # --- 步骤 1: 生成素材 ---
            # 使用 LaTeX 生成图片
            compile_latex_slide(
                slide['title'], 
                slide['bullets'], 
                img_path, 
                session_dir,
                progress_callback=progress_callback
            )
            
            # 生成语音
            await generate_audio(
                slide['narration'], 
                audio_path,
                progress_callback=progress_callback
            )

            # --- 步骤 2: 合成 Clip ---
            # 检查素材是否生成成功
            if not os.path.exists(img_path) or not os.path.exists(audio_path):
                print(f"[WARNING] 片段 {idx} 素材缺失，跳过。")
                if progress_callback:
                    progress_callback(f"⚠️ 第 {slide_num} 页素材生成失败，跳过")
                continue

            if progress_callback:
                progress_callback(f"🎞️ 合成第 {slide_num} 页视频片段...")
                
            audio_clip = AudioFileClip(audio_path)
            # 关键：设置图片时长与音频一致，并指定 fps
            image_clip = ImageClip(img_path).set_duration(audio_clip.duration).set_fps(24)
            # 将音频合入视频片段
            video_clip = image_clip.set_audio(audio_clip)
            clips.append(video_clip)
            
            if progress_callback:
                progress_callback(f"✅ 第 {slide_num}/{total_slides} 页完成")

        if not clips:
            raise Exception("没有生成任何视频片段")

        # --- 步骤 3: 拼接 ---
        if progress_callback:
            progress_callback(f"🔗 正在拼接 {len(clips)} 个视频片段...")
            
        print("[INFO] 正在拼接最终视频...")
        # compose 方法通常更稳定
        final_video = concatenate_videoclips(clips, method="compose")
        output_path = os.path.join(session_dir, "final_output.mp4")
        
        if progress_callback:
            progress_callback(f"💾 正在导出最终视频文件...")
        
        # 写入文件
        final_video.write_videofile(
            output_path, 
            fps=24, 
            codec='libx264', 
            audio_codec='aac', # 确保音频编码正确
            threads=4,
            logger=None # 减少控制台刷屏
        )
        
        print(f"[SUCCESS] 视频生成完毕: {output_path}")
        
        if progress_callback:
            progress_callback(f"🎉 视频制作完成！")
            
        return output_path

    finally:
        # 资源清理，防止内存泄漏
        try:
            for clip in clips:
                if clip.audio: clip.audio.close()
                clip.close()
        except Exception:
            pass