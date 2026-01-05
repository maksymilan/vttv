"""
重新组织范例视频文件结构
将文件重新组织为：动作名称-index 的格式
"""
import os
import sys
import shutil
import re

# Add parent directory to path to allow importing from app if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 范例视频目录
# 使用相对路径，确保在任何位置运行都能找到正确目录
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.join(BACKEND_DIR, "data", "范例视频")
BACKUP_DIR = os.path.join(BACKEND_DIR, "data", "范例视频_备份")

def backup_original():
    """备份原始文件"""
    if os.path.exists(BACKUP_DIR):
        print(f"⚠️  备份目录已存在，跳过备份")
        return
    
    print(f"📦 正在备份原始文件到: {BACKUP_DIR}")
    shutil.copytree(BASE_DIR, BACKUP_DIR)
    print(f"✅ 备份完成")

def clean_old_structure():
    """清理旧的文件夹结构"""
    print("\n🧹 清理旧的文件夹...")
    
    # 删除旧的子目录（但保留文件）
    old_dirs = []
    for item in os.listdir(BASE_DIR):
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isdir(item_path) and item not in ['腰疼（没写特征词）', '颈椎（没写特征词、可不做）']:
            old_dirs.append(item)
    
    for old_dir in old_dirs:
        old_path = os.path.join(BASE_DIR, old_dir)
        # 将子目录中的文件移到根目录
        for file in os.listdir(old_path):
            src = os.path.join(old_path, file)
            dst = os.path.join(BASE_DIR, f"{old_dir.replace(' ', '').replace('(', '').replace(')', '')}_{file}")
            if os.path.isfile(src):
                shutil.move(src, dst)
                print(f"  移动: {file} -> {dst}")
        # 删除空目录
        os.rmdir(old_path)
        print(f"  删除目录: {old_dir}")

def organize_videos():
    """重新组织视频文件"""
    print("\n📂 开始重新组织文件...")
    
    # 收集所有mp4和txt文件
    files = {}
    for file in os.listdir(BASE_DIR):
        if file.startswith('.') or file == 'video_index.json' or file == 'README.md':
            continue
        
        file_path = os.path.join(BASE_DIR, file)
        if not os.path.isfile(file_path):
            continue
            
        if file.endswith('.mp4') or file.endswith('.txt'):
            # 提取基础名称和编号
            base_name = re.sub(r'\d+', '', file)
            base_name = re.sub(r'\.[^.]+$', '', base_name)  # 移除扩展名
            base_name = re.sub(r'\s*\([^)]*\)', '', base_name)  # 移除括号
            base_name = re.sub(r'\s*（[^）]*）', '', base_name)  # 移除中文括号
            base_name = base_name.strip()
            
            # 提取编号
            num_match = re.search(r'(\d+)', file)
            if num_match:
                num = int(num_match.group(1))
                
                if base_name not in files:
                    files[base_name] = {}
                if num not in files[base_name]:
                    files[base_name][num] = {}
                
                if file.endswith('.mp4'):
                    files[base_name][num]['mp4'] = file
                else:
                    files[base_name][num]['txt'] = file
    
    # 创建新的目录结构
    for category, videos in files.items():
        print(f"\n处理分类: {category}")
        
        for index, file_info in sorted(videos.items()):
            # 创建目录名: 动作名称-index
            folder_name = f"{category}-{index}"
            folder_path = os.path.join(BASE_DIR, folder_name)
            
            # 创建目录
            os.makedirs(folder_path, exist_ok=True)
            
            # 统一文件命名: 视频.mp4 和 标签.txt
            if 'mp4' in file_info:
                src_mp4 = os.path.join(BASE_DIR, file_info['mp4'])
                dst_mp4 = os.path.join(folder_path, '视频.mp4')
                if os.path.exists(src_mp4):
                    shutil.move(src_mp4, dst_mp4)
                    print(f"  ✓ {file_info['mp4']} -> {folder_name}/视频.mp4")
            
            if 'txt' in file_info:
                src_txt = os.path.join(BASE_DIR, file_info['txt'])
                dst_txt = os.path.join(folder_path, '标签.txt')
                if os.path.exists(src_txt):
                    shutil.move(src_txt, dst_txt)
                    print(f"  ✓ {file_info['txt']} -> {folder_name}/标签.txt")
            
            # 如果只有视频没有标签，创建空标签文件
            if 'mp4' in file_info and 'txt' not in file_info:
                empty_txt = os.path.join(folder_path, '标签.txt')
                with open(empty_txt, 'w', encoding='utf-8') as f:
                    f.write(f"{category},康复训练")
                print(f"  ℹ️  创建空标签文件: {folder_name}/标签.txt")

def rename_old_folders():
    """重命名没写特征词的文件夹"""
    print("\n📝 重命名特殊文件夹...")
    
    old_names = {
        '腰疼（没写特征词）': '腰部训练',
        '颈椎（没写特征词、可不做）': '颈椎训练'
    }
    
    for old_name, new_name in old_names.items():
        old_path = os.path.join(BASE_DIR, old_name)
        if os.path.exists(old_path):
            # 遍历这些目录中的文件，按相同规则组织
            files = os.listdir(old_path)
            mp4_files = sorted([f for f in files if f.endswith('.mp4')])
            
            for idx, mp4_file in enumerate(mp4_files, 1):
                # 创建新目录
                folder_name = f"{new_name}-{idx}"
                folder_path = os.path.join(BASE_DIR, folder_name)
                os.makedirs(folder_path, exist_ok=True)
                
                # 移动视频文件
                src_mp4 = os.path.join(old_path, mp4_file)
                dst_mp4 = os.path.join(folder_path, '视频.mp4')
                shutil.move(src_mp4, dst_mp4)
                print(f"  ✓ {old_name}/{mp4_file} -> {folder_name}/视频.mp4")
                
                # 查找对应的txt文件
                txt_file = mp4_file.replace('.mp4', '.txt')
                src_txt = os.path.join(old_path, txt_file)
                if os.path.exists(src_txt):
                    dst_txt = os.path.join(folder_path, '标签.txt')
                    shutil.move(src_txt, dst_txt)
                    print(f"  ✓ {old_name}/{txt_file} -> {folder_name}/标签.txt")
                else:
                    # 创建标签文件
                    dst_txt = os.path.join(folder_path, '标签.txt')
                    with open(dst_txt, 'w', encoding='utf-8') as f:
                        f.write(f"{new_name},康复训练")
                    print(f"  ℹ️  创建标签文件: {folder_name}/标签.txt")
            
            # 删除旧目录
            try:
                shutil.rmtree(old_path)
                print(f"  删除旧目录: {old_name}")
            except:
                print(f"  ⚠️  无法删除目录: {old_name} (可能还有文件)")

def cleanup_remaining():
    """清理剩余的零散文件"""
    print("\n🧹 清理剩余文件...")
    
    for item in os.listdir(BASE_DIR):
        if item.startswith('.'):
            continue
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isfile(item_path) and item not in ['video_index.json', 'README.md']:
            print(f"  ℹ️  发现零散文件: {item}")

def print_summary():
    """打印总结"""
    print("\n" + "="*60)
    print("📊 重组完成统计")
    print("="*60)
    
    folders = [f for f in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, f)) and not f.startswith('.')]
    
    categories = {}
    for folder in sorted(folders):
        # 提取分类名
        match = re.match(r'(.+)-(\d+)', folder)
        if match:
            category = match.group(1)
            if category not in categories:
                categories[category] = []
            categories[category].append(folder)
    
    print(f"\n总文件夹数: {len(folders)}")
    print(f"分类数: {len(categories)}")
    print("\n各分类详情:")
    for category, folder_list in sorted(categories.items()):
        print(f"  {category}: {len(folder_list)} 个视频")
        for folder in sorted(folder_list):
            folder_path = os.path.join(BASE_DIR, folder)
            has_mp4 = os.path.exists(os.path.join(folder_path, '视频.mp4'))
            has_txt = os.path.exists(os.path.join(folder_path, '标签.txt'))
            status = "✓" if (has_mp4 and has_txt) else "⚠️"
            print(f"    {status} {folder}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    print("="*60)
    print("🎬 范例视频文件重组工具")
    print("="*60)
    
    # 确认操作
    print(f"\n将重新组织目录: {BASE_DIR}")
    print(f"文件将被组织为: 动作名称-index/视频.mp4 和 动作名称-index/标签.txt")
    print(f"原始文件将备份到: {BACKUP_DIR}")
    
    confirm = input("\n确认执行？(yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ 操作已取消")
        exit(0)
    
    # 执行重组
    try:
        backup_original()
        clean_old_structure()
        organize_videos()
        rename_old_folders()
        cleanup_remaining()
        print_summary()
        
        print("\n✅ 文件重组完成！")
        print(f"💡 原始文件已备份到: {BACKUP_DIR}")
        print(f"💡 请运行以下命令重建索引:")
        print(f"   curl -X POST http://localhost:8000/api/example-videos/rebuild-index")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        print(f"\n如需恢复，请使用备份目录: {BACKUP_DIR}")
