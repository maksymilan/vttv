import os
import edge_tts
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont
import textwrap
from app.config import settings

async def generate_audio(text, output_file):
    communicate = edge_tts.Communicate(text, "zh-CN-YunxiNeural")
    await communicate.save(output_file)

def create_slide_image(title, lines, output_path):
    # 1920x1080 画布
    img = Image.new('RGB', (1920, 1080), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    
    # 简单的字体加载逻辑
    try:
        # Linux/Docker 环境下可能需要指定具体 ttf 路径
        title_font = ImageFont.truetype("arial.ttf", 80)
        body_font = ImageFont.truetype("arial.ttf", 50)
    except IOError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()

    # 绘制标题
    draw.text((100, 80), title, fill=(0, 0, 139), font=title_font)
    
    # 绘制列表
    y_pos = 250
    for line in lines:
        wrapped = textwrap.wrap(line, width=40)
        for w_line in wrapped:
            draw.text((150, y_pos), f"- {w_line}", fill=(50, 50, 50), font=body_font)
            y_pos += 70

    img.save(output_path)

async def render_final_video(script_data, session_id):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    clips = []
    slides = script_data.get("slides", [])

    for idx, slide in enumerate(slides):
        img_path = os.path.join(session_dir, f"slide_{idx}.png")
        audio_path = os.path.join(session_dir, f"audio_{idx}.mp3")

        # 生成素材
        create_slide_image(slide['title'], slide['bullets'], img_path)
        await generate_audio(slide['narration'], audio_path)

        # 合成片段
        audio_clip = AudioFileClip(audio_path)
        # 设置图片时长等于音频时长
        image_clip = ImageClip(img_path).set_duration(audio_clip.duration)
        image_clip = image_clip.set_audio(audio_clip)
        
        clips.append(image_clip)

    # 拼接
    final_video = concatenate_videoclips(clips, method="compose")
    output_filename = "final_output.mp4"
    output_path = os.path.join(session_dir, output_filename)
    
    final_video.write_videofile(output_path, fps=24, codec='libx264', audio_codec='aac')
    
    return output_path