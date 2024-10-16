import json
import os
from datetime import datetime

WORDS_FILE = 'static/words.json'


class WordManager:
    def __init__(self):
        self.words_file = WORDS_FILE

    def load_words(self):
        """加载现有的单词数据"""
        if os.path.exists(self.words_file):
            with open(self.words_file, 'r', encoding='utf-8') as file:
                return json.load(file)
        return {}

    def save_words(self, data):
        """保存单词数据"""
        words = self.load_words()
        chapter = data.get('chapter')
        section = data.get('section')

        if chapter and section:
            if chapter not in words:
                words[chapter] = {}
            if section not in words[chapter]:
                words[chapter][section] = []

            words[chapter][section] = data['words']

            with open(self.words_file, 'w', encoding='utf-8') as file:
                json.dump(words, file, ensure_ascii=False, indent=4)

    def calculate_results_and_update_errors(self, user_data, words):
        """计算测试结果并更新单词错误次数"""
        results = {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'duration': None,  # 占位符，稍后会填充
            'chapters': [],
            'total_accuracy': 0
        }
        total_correct = 0
        total_questions = 0

        for chapter, sections in user_data.items():
            chapter_result = {
                'chapter_name': chapter,
                'sections': [],
                'chapter_accuracy': 0
            }
            chapter_correct = 0
            chapter_total = 0

            for section, user_answers in sections.items():
                section_result = {
                    'section_name': section,
                    'correct_count': 0,
                    'total_count': len(user_answers),
                    'section_accuracy': 0,
                    'errors': []
                }

                word_objects = words[chapter][section]
                for i, word in enumerate(word_objects):
                    correct_word = word['word']
                    user_input = user_answers[i] if i < len(user_answers) else ""
                    if user_input.lower() == correct_word.lower():
                        section_result['correct_count'] += 1
                    else:
                        word['error_count'] += 1
                        section_result['errors'].append({
                            'correct_word': correct_word,
                            'user_input': user_input,
                            'error_count': word['error_count']
                        })

                section_result['section_accuracy'] = (section_result['correct_count'] / section_result[
                    'total_count']) * 100
                chapter_result['sections'].append(section_result)
                chapter_correct += section_result['correct_count']
                chapter_total += section_result['total_count']

            chapter_result['chapter_accuracy'] = (chapter_correct / chapter_total) * 100
            total_correct += chapter_correct
            total_questions += chapter_total
            results['chapters'].append(chapter_result)

        results['total_accuracy'] = (total_correct / total_questions) * 100
        return results