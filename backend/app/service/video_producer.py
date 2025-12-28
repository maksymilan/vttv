import os
import subprocess
import shutil
import edge_tts
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from pdf2image import convert_from_path
from jinja2 import Template
from app.config import settings
from PIL import Image 

# --- LaTeX 模版配置 ---
LATEX_TEMPLATE = r"""
\documentclass[aspectratio=169]{beamer}
\usepackage{fontspec}
\usepackage{xeCJK}
\usepackage{graphicx}
\usepackage{hyperref}

% 禁用底部导航条
\setbeamertemplate{navigation symbols}{}

% --- 字体配置开始 ---
% 1. 设置英文字体 (Times New Roman)
\setmainfont[
    Path = {{ font_dir }}/,
    BoldFont = Times-New-Roman-Bold.ttf,
    Extension = .ttf
]{Times-New-Roman}

% 2. 设置中文字体 (Noto Serif SC)
% 注意：我们将 BoldFont 指向了 SemiBold 文件
\setCJKmainfont[
    Path = {{ font_dir }}/,
    BoldFont = NotoSerifSC-SemiBold.ttf,
    Extension = .ttf
]{NotoSerifSC-Regular}
% --- 字体配置结束 ---

% 定义学术蓝配色
\definecolor{primary}{RGB}{0, 51, 102}
\setbeamercolor{frametitle}{fg=primary}
\setbeamercolor{structure}{fg=primary}

\begin{document}

\begin{frame}
    \frametitle{ {{ title }} }
    \begin{itemize}
        \setlength\itemsep{1.5em}
        {% for bullet in bullets %}
        % 使用 \Large 增大字号，确保视频中清晰可见
        \item \Large {{ bullet }}
        {% endfor %}
    \end{itemize}
\end{frame}

\end{document}
"""

async def generate_audio(text, output_file):
    """使用 Edge-TTS 生成语音文件"""
    communicate = edge_tts.Communicate(text, "zh-CN-YunxiNeural")
    await communicate.save(output_file)

def compile_latex_slide(title, bullets, output_image_path, session_dir):
    """
    使用 XeLaTeX 编译幻灯片，支持自定义学术字体
    """
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
    template = Template(LATEX_TEMPLATE)
    tex_content = template.render(
        title=title,
        bullets=bullets,
        font_dir=font_dir
    )

    # 3. 写入 .tex 文件
    tex_filename = "slide.tex"
    tex_path = os.path.join(session_dir, tex_filename)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)

    # 4. 调用 xelatex 编译
    # -interaction=nonstopmode 防止编译错误时卡住进程
    print(f"[INFO] 正在编译 LaTeX: {title[:10]}...")
    try:
        subprocess.run(
            ["xelatex", "-interaction=nonstopmode", tex_filename],
            cwd=session_dir, # 在临时目录下执行
            check=True,
            stdout=subprocess.DEVNULL, # 隐藏常规日志
            stderr=subprocess.PIPE     # 捕获错误日志
        )
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] LaTeX 编译失败: {e.stderr.decode()}")
        # 失败回退：生成一张纯色错误图片，防止程序崩溃
        Image.new('RGB', (1920, 1080), color=(200, 200, 200)).save(output_image_path)
        return

    # 5. 将生成的 PDF 转为 PNG
    pdf_path = os.path.join(session_dir, "slide.pdf")
    if os.path.exists(pdf_path):
        # dpi=200 约等于 1080p 分辨率
        images = convert_from_path(pdf_path, dpi=200) 
        if images:
            # 直接保存第一页
            images[0].save(output_image_path, "PNG")
    else:
        print("[ERROR] PDF 文件未生成")
        # 生成空白图兜底
        Image.new('RGB', (1920, 1080), color=(255, 255, 255)).save(output_image_path)

async def render_final_video(script_data, session_id):
    """合成最终视频"""
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    clips = []
    slides = script_data.get("slides", [])

    try:
        print(f"[INFO] 开始渲染视频，共 {len(slides)} 页...")
        
        for idx, slide in enumerate(slides):
            img_path = os.path.join(session_dir, f"slide_{idx}.png")
            audio_path = os.path.join(session_dir, f"audio_{idx}.mp3")
            
            # --- 步骤 1: 生成素材 ---
            # 使用 LaTeX 生成图片
            compile_latex_slide(slide['title'], slide['bullets'], img_path, session_dir)
            # 生成语音
            await generate_audio(slide['narration'], audio_path)

            # --- 步骤 2: 合成 Clip ---
            # 检查素材是否生成成功
            if not os.path.exists(img_path) or not os.path.exists(audio_path):
                print(f"[WARNING] 片段 {idx} 素材缺失，跳过。")
                continue

            audio_clip = AudioFileClip(audio_path)
            # 关键：设置图片时长与音频一致，并指定 fps
            image_clip = ImageClip(img_path).set_duration(audio_clip.duration).set_fps(24)
            # 将音频合入视频片段
            video_clip = image_clip.set_audio(audio_clip)
            clips.append(video_clip)

        if not clips:
            raise Exception("没有生成任何视频片段")

        # --- 步骤 3: 拼接 ---
        print("[INFO] 正在拼接最终视频...")
        # compose 方法通常更稳定
        final_video = concatenate_videoclips(clips, method="compose")
        output_path = os.path.join(session_dir, "final_output.mp4")
        
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
        return output_path

    finally:
        # 资源清理，防止内存泄漏
        try:
            for clip in clips:
                if clip.audio: clip.audio.close()
                clip.close()
        except Exception:
            pass