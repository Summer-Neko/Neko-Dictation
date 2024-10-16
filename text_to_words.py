import json
import os
import re

WORDS_FILE = 'words.json'
INPUT_FILE = 'input1.txt'

def load_words():
    """加载现有的单词数据"""
    if os.path.exists(WORDS_FILE):
        with open(WORDS_FILE, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

def save_words(words):
    """保存单词数据到 JSON 文件"""
    with open(WORDS_FILE, 'w', encoding='utf-8') as file:
        json.dump(words, file, ensure_ascii=False, indent=4)

def parse_input_file():
    """解析输入文本文件并返回章节数据结构"""
    with open(INPUT_FILE, 'r', encoding='utf-8') as file:
        content = file.read()

    words_data = {}
    current_chapter = None
    current_section = None

    for line in content.splitlines():
        line = line.strip()

        if not line:  # 跳过空行
            continue

        # 解析章节
        chapter_match = re.match(r'^# (.+)$', line)
        if chapter_match:
            current_chapter = chapter_match.group(1)
            words_data[current_chapter] = {}
            continue

        # 解析小节
        section_match = re.match(r'^##\s*(.+)$', line)
        if section_match:
            current_section = section_match.group(1)
            words_data[current_chapter][current_section] = []
            continue

        # 自动识别并分割英文单词与中文释义
        if current_chapter and current_section and line:
            word, meaning = split_word_meaning(line)
            if word and meaning:
                words_data[current_chapter][current_section].append({
                    "word": word.strip(),
                    "meaning": meaning.strip(),
                    "error_count": 0
                })

    return words_data

def split_word_meaning(line):
    """自动识别并分割英文单词和中文释义"""
    # 查找第一个中文字符的位置
    for i, char in enumerate(line):
        if '\u4e00' <= char <= '\u9fff':  # 检查是否是中文字符
            return line[:i].strip(), line[i:].strip()
    return None, None

def update_words_json():
    """将解析的数据合并到现有的 words.json 中"""
    words = load_words()
    new_words = parse_input_file()

    for chapter, sections in new_words.items():
        if chapter not in words:
            words[chapter] = sections
        else:
            for section, word_list in sections.items():
                if section not in words[chapter]:
                    words[chapter][section] = word_list
                else:
                    words[chapter][section].extend(word_list)

    save_words(words)
    print("单词已成功添加到 words.json 中！")

if __name__ == "__main__":
    update_words_json()