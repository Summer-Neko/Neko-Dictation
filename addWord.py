import json
import os

def load_existing_data(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

def save_data(file_path, data):
    """将数据保存到JSON文件"""
    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

def add_chapter(data):
    chapter_name = input("请输入章节名称: ")
    if chapter_name in data:
        print(f"章节 '{chapter_name}' 已存在，将添加新的小节。")
    else:
        data[chapter_name] = {}

    while True:
        section_name = input("请输入小节名称: ")
        if section_name in data[chapter_name]:
            print(f"小节 '{section_name}' 已存在，将添加新的单词。")
        else:
            data[chapter_name][section_name] = []

        while True:
            word = input("请输入单词（或短语），输入 'q' 返回上一级: ")
            if word.lower() == 'q':
                break
            data[chapter_name][section_name].append({"word": word, "error_count": 0})

        cont = input("是否要添加另一个小节？ (y/n): ")
        if cont.lower() != 'y':
            break

def main():
    file_path = 'words.json'
    data = load_existing_data(file_path)

    while True:
        add_chapter(data)
        save_data(file_path, data)
        cont = input("是否要添加另一个章节？ (y/n): ")
        if cont.lower() != 'y':
            print("数据保存完毕，退出程序。")
            break

if __name__ == "__main__":
    main()