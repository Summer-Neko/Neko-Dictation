import json
import random
import re

from flask import Flask, render_template, request, jsonify

from word_management import WordManager
from datetime import datetime, timedelta
import os

# 打卡系统
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from flask import redirect, url_for, send_from_directory
import uuid

from flask import flash, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_session import Session
#


app = Flask(__name__)

RESULTS_FILE = 'results.json'
app.config['SECRET_KEY'] = '6e9e415ea40bb2daa70500da84b38bff'
COUNTDOWN_FILE = 'countdown.json'
word_manager = WordManager()

# 打卡系统


app.config['SESSION_TYPE'] = 'filesystem'  # 存储在文件系统中
app.config['SESSION_FILE_DIR'] = os.path.join(app.instance_path, 'flask_session')  # 将会话文件存储到 instance 文件夹中
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_PERMANENT'] = True  # 默认情况下会话为永久会话
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # 设置默认会话时间为7天
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///schedules.db'
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB
Session(app)

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 数据库模型
import uuid

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    session_token = db.Column(db.String(36), unique=True, nullable=True, default=str(uuid.uuid4()))

    def generate_session_token(self):
        self.session_token = str(uuid.uuid4())
        db.session.commit()

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, default=datetime.utcnow)
    rating = db.Column(db.String(1))
    feedback = db.Column(db.String(500))
    is_locked = db.Column(db.Boolean, default=False)
    tasks = db.relationship('Task', backref='schedule', lazy=True)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200))
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)  # 新增字段，允许为空
    photos = db.relationship('Photo', backref='task', lazy=True)


class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100))
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)


# 初始化数据库
def create_tables():
    with app.app_context():
        db.create_all()


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if User.query.first():
        flash('已有圣上，不能再创建。', 'danger')
        return redirect(url_for('login'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        password_hash = generate_password_hash(password, method='pbkdf2:sha256')

        new_user = User(username=username, password=password_hash)
        db.session.add(new_user)
        db.session.commit()

        flash('登基成功，请上朝！', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember') == 'on'

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            # Generate a new session token
            new_session_token = str(uuid.uuid4())
            user.session_token = new_session_token
            db.session.commit()
            # Log in the user with the new session token
            login_user(user, remember=remember)

            # Store the session token in the session data
            session['session_token'] = new_session_token

            flash('成功登陆！', 'success')
            return redirect(url_for('admin'))
        else:
            flash('用户名或密码错误', 'danger')

    return render_template('login.html')

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.before_request
def check_session():
    if current_user.is_authenticated:
        user = User.query.get(current_user.id)
        if user.session_token != session.get('session_token'):
            logout_user()
            flash('您的会话已在另一个地方登录，已被注销。', 'warning')
            return redirect(url_for('login'))


@app.route('/create_schedule', methods=['GET', 'POST'])
def create_schedule():
    if request.method == 'POST':
        new_schedule = Schedule()
        db.session.add(new_schedule)
        db.session.commit()

        tasks = request.form.getlist('task_content')
        for task_content in tasks:
            if task_content.strip():  # 忽略空任务
                new_task = Task(content=task_content, schedule=new_schedule)
                db.session.add(new_task)
        db.session.commit()

        return redirect(url_for('create_schedule'))

    schedules = Schedule.query.order_by(Schedule.date.desc()).all()
    return render_template('create_schedule.html', schedules=schedules)



@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)



@app.route('/upload_photos/<int:task_id>', methods=['POST'])
def upload_photos(task_id):
    task = Task.query.get(task_id)
    if not task or task.schedule.is_locked:
        return redirect(url_for('create_schedule'))

    files = request.files.getlist('photos')
    for file in files:
        if file and file.filename:
            # 使用 generate_unique_filename 生成唯一的文件名
            filename = generate_unique_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            new_photo = Photo(filename=filename, task=task)
            db.session.add(new_photo)

    # 更新 completed_at 为当前时间，使用 UTC+8（北京时间）
    task.completed_at = datetime.utcnow() + timedelta(hours=8)
    db.session.commit()

    return redirect(url_for('create_schedule'))


# 生成唯一文件名
def generate_unique_filename(original_filename):
    extension = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4()}{extension}"
    return unique_filename


@app.route('/delete_photo/<int:photo_id>', methods=['POST'])
def delete_photo(photo_id):
    photo = Photo.query.get(photo_id)
    if photo:
        delete_photo_file(photo.filename)  # 安全删除文件
        db.session.delete(photo)  # 删除数据库中的照片记录
        db.session.commit()
    return redirect(url_for('create_schedule'))


@app.route('/admin', methods=['GET', 'POST'])
@login_required
def admin():
    if request.method == 'POST':
        schedule_id = request.form.get('schedule_id')
        rating = request.form.get('rating')
        feedback = request.form.get('feedback')
        schedule = Schedule.query.get(schedule_id)
        if schedule:
            schedule.rating = rating
            schedule.feedback = feedback
            schedule.is_locked = True  # 锁定日程
            db.session.commit()

    schedules = Schedule.query.order_by(Schedule.date.desc()).all()
    return render_template('admin.html', schedules=schedules)


def delete_photo_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"File {filename} deleted successfully.")
        else:
            print(f"File {filename} not found.")
    except Exception as e:
        print(f"Error deleting file {filename}: {e}")


@app.route('/delete_schedule/<int:schedule_id>', methods=['POST'])
def delete_schedule(schedule_id):
    schedule = Schedule.query.get(schedule_id)
    if schedule:
        for task in schedule.tasks:
            for photo in task.photos:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], photo.filename))
                db.session.delete(photo)
            db.session.delete(task)
        db.session.delete(schedule)
        db.session.commit()
    return redirect(url_for('admin'))


@app.route('/temp_test')
def temp_test():
    return render_template('temp_test.html')
# end


def load_config():
    config = {
        'HOST': '127.0.0.1',
        'PORT': 5000,
        'DEBUG': False
    }
    if os.path.exists('config.txt'):
        with open('config.txt', 'r') as f:
            for line in f:
                key, value = line.strip().split('=')
                if key in config:
                    if key == 'PORT':
                        config[key] = int(value)
                    elif key == 'DEBUG':
                        config[key] = value.lower() in ['true', '1', 'yes']
                    else:
                        config[key] = value
    return config


config = load_config()


def load_results():
    """加载现有的测试结果"""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as file:
            return json.load(file)
    return []


def save_results(results):
    """保存测试结果"""
    with open(RESULTS_FILE, 'w', encoding='utf-8') as file:
        json.dump(results, file, ensure_ascii=False, indent=4)


@app.route('/')
def index():
    """首页"""
    results = load_results()
    return render_template('index.html', results=results)


@app.route('/test')
def test():
    """测试页面"""
    return render_template('test.html')


@app.route('/manage_words')
def manage_words():
    """单词管理页面"""
    return render_template('manage_words.html')


@app.route('/get_words')
def get_words():
    """获取单词数据"""
    return jsonify(word_manager.load_words())


@app.route('/save_words', methods=['POST'])
def save_words():
    """保存单词数据"""
    data = request.json
    word_manager.save_words(data)
    return jsonify({'success': True})


@app.route('/submit', methods=['POST'])
def submit():
    data = request.json['data']
    duration = request.json['duration']
    test_mode = request.json.get('test_mode', 'all')  # 获取测试模式，默认为 'all'

    words = word_manager.load_words()  # 加载现有的单词数据

    results = {
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "duration": duration,
        "chapters": [],
        "test_mode": test_mode  # 保存测试模式
    }

    total_correct_all = 0
    total_count_all = 0

    for chapter_name, sections in data.items():
        chapter_result = {
            "chapter_name": chapter_name,
            "sections": [],
            "chapter_accuracy": 0
        }
        total_correct = 0
        total_count = 0

        for section_name, answers in sections.items():
            section_result = {
                "section_name": section_name,
                "correct_count": 0,
                "total_count": len(answers),
                "section_accuracy": 0,
                "errors": [],
                "correct_words": []
            }

            for i, answer in enumerate(answers):
                word_data = words[chapter_name][section_name][i]
                if answer.strip().lower() == word_data['word'].lower():
                    section_result['correct_count'] += 1
                    section_result['correct_words'].append({
                        "word": word_data['word'],
                        "meaning": word_data['meaning']
                    })
                else:
                    section_result['errors'].append({
                        "correct_word": word_data['word'],
                        "meaning": word_data['meaning'],
                        "user_answer": answer
                    })
                    word_data['error_count'] += 1  # 增加错误次数

            section_result['section_accuracy'] = (section_result['correct_count'] / section_result['total_count']) * 100
            total_correct += section_result['correct_count']
            total_count += section_result['total_count']
            chapter_result['sections'].append(section_result)

        chapter_result['chapter_accuracy'] = (total_correct / total_count) * 100
        results['chapters'].append(chapter_result)

        total_correct_all += total_correct
        total_count_all += total_count

    results['total_accuracy'] = (total_correct_all / total_count_all) * 100

    # 保存更新后的单词错误次数
    word_manager.save_words(words)

    # 保存测试结果
    all_results = load_results()
    all_results.append(results)
    save_results(all_results)

    return jsonify(results)


@app.route('/delete_result', methods=['POST'])
def delete_result():
    """删除指定的测试记录"""
    timestamp = request.json.get('timestamp')
    all_results = load_results()

    # 根据时间戳匹配并删除相应记录
    updated_results = [result for result in all_results if result['timestamp'] != timestamp]

    save_results(updated_results)
    return jsonify({"success": True, "results": updated_results})


@app.route('/word_learning')
def word_learning():
    """背单词页面"""
    return render_template('word_learning.html')


@app.route('/listening_quiz')
def listening_quiz():
    """听选测试页面"""
    return render_template('listening_quiz.html')


@app.route('/analysis')
def analysis():
    """数据分析页面"""
    return render_template('analysis.html')


@app.route('/generate_quiz_questions')
def generate_quiz_questions():
    # 确保sections参数被正确获取
    selected_sections = request.args.get('sections').split(',')
    words = word_manager.load_words()

    quiz_questions = []

    for section in selected_sections:
        chapter, section_name = section.split('-')
        word_list = words[chapter][section_name]

        for word_obj in word_list:
            correct_word = word_obj['word']
            similar_words = generate_similar_words(word_list, correct_word)

            question = {
                'word': correct_word,
                'options': similar_words,
                'correctAnswer': correct_word,
                'sectionName': section_name  # 包含小节名称
            }
            quiz_questions.append(question)

    # 保留原始顺序
    return jsonify(quiz_questions)


def generate_similar_words(word_list, target_word):
    # 从列表中生成近邻或相似的单词
    all_words = [w['word'] for w in word_list]

    similar_words = [target_word]

    # 尝试找到目标单词的索引
    try:
        target_index = all_words.index(target_word)
    except ValueError:
        target_index = None

    if target_index is not None:
        # 选择目标单词的前后相邻单词
        if target_index > 0:
            similar_words.append(all_words[target_index - 1])
        if target_index < len(all_words) - 1:
            similar_words.append(all_words[target_index + 1])

    # 填充剩余选项
    while len(similar_words) < 4:
        word = random.choice(all_words)
        if word not in similar_words:
            similar_words.append(word)

    random.shuffle(similar_words)
    return similar_words


@app.route('/mistake_learning')
def mistake_learning():
    """错题学习页面"""
    return render_template('mistake_learning.html')


@app.route('/get_mistake_words')
def get_mistake_words():
    results = load_results()  # 从结果文件中加载所有测试结果
    mistake_words = {}

    for result in results:
        for chapter in result["chapters"]:
            for section in chapter["sections"]:
                if section["errors"]:
                    chapter_name = chapter["chapter_name"]
                    section_name = section["section_name"]

                    if chapter_name not in mistake_words:
                        mistake_words[chapter_name] = {}

                    if section_name not in mistake_words[chapter_name]:
                        mistake_words[chapter_name][section_name] = []

                    for error in section["errors"]:
                        mistake_words[chapter_name][section_name].append({
                            "word": error["correct_word"],
                            "meaning": error["meaning"]
                        })

    return jsonify(mistake_words)


@app.route('/generate_mistake_quiz_questions', methods=['GET'])
def generate_mistake_quiz_questions():
    selected_sections = request.args.get('sections').split(',')
    results = load_results()
    quiz_questions = []

    for result in results:
        for chapter in result['chapters']:
            for section in chapter['sections']:
                section_key = f"{chapter['chapter_name']}-{section['section_name']}"
                if section_key in selected_sections:
                    for error in section['errors']:
                        correct_word = error['correct_word']
                        correct_meaning = error['meaning']
                        options = generate_similar_words_chinese(correct_meaning, section['errors'])

                        question = {
                            'word': correct_word,
                            'options': options,
                            'correctAnswer': correct_meaning
                        }
                        quiz_questions.append(question)

    if not quiz_questions:
        return jsonify({'error': 'No questions generated.'}), 400

    return jsonify(quiz_questions)


def generate_similar_words_chinese(correct_meaning, error_list):
    all_meanings = list(set([error['meaning'] for error in error_list if error['meaning'] != correct_meaning]))
    options = [correct_meaning]

    while len(options) < 4 and all_meanings:
        meaning = random.choice(all_meanings)
        options.append(meaning)
        all_meanings.remove(meaning)

    random.shuffle(options)
    return options

@app.route('/get_section_trend_data')
def get_section_trend_data():
    section_name = request.args.get('section')
    results = load_results()

    if not section_name or not results:
        return jsonify({"labels": [], "values": []})

    # 收集最近10次该小节的正确率
    section_trend_data = {
        "labels": [],
        "values": []
    }

    # 按时间顺序获取所有结果（假设results已经按时间顺序排序）
    for result in results[-10:]:
        for chapter in result['chapters']:
            for section in chapter['sections']:
                full_section_name = f"{chapter['chapter_name']} - {section['section_name']}"
                if full_section_name == section_name:
                    section_trend_data["labels"].append(result["timestamp"])
                    section_trend_data["values"].append(section["section_accuracy"])
                    break  # 找到之后不再继续查找

    return jsonify(section_trend_data)


@app.route('/get_analysis_data')
def get_analysis_data():
    results = load_results()

    if not results:
        return jsonify({
            "overallAccuracy": {"labels": [], "values": []},
            "chapterAccuracyComparison": {"labels": [], "tests": []},
            "sectionAccuracy": {"labels": [], "values": []},
            "sectionAccuracyHistory": {"labels": [], "datasets": []},
            "errorRanking": [],
            "summary": {
                "message": "目前还没有进行测试哦",
                "fullTestCount": 0,
                "customTestCount": 0,
                "totalDuration": "0分0秒",
                "totalAccuracy": 0,
                "bestSection": "N/A",
                "bestSectionAccuracy": 0,
                "worstSection": "N/A",
                "worstSectionAccuracy": 0
            }
        })

    # 分离全测试数据和全部数据
    full_test_results = [result for result in results if result.get('test_mode') == 'all']

    # 只保留最近 6 次全测试
    recent_results = full_test_results[-6:]

    overall_accuracy = {
        "labels": [result["timestamp"] for result in recent_results],
        "values": [result["total_accuracy"] for result in recent_results]
    }

    chapter_accuracy_comparison = {
        "labels": [],  # 章节名称列表
        "tests": []  # 每次测试的章节正确率数据
    }

    section_accuracy = {}
    section_accuracy_history = {"labels": [], "datasets": []}
    error_ranking = {}

    # 初始化章节列表
    if recent_results:
        chapter_accuracy_comparison["labels"] = [chapter["chapter_name"] for chapter in recent_results[0]["chapters"]]

    for result in recent_results:
        test_data = {
            "timestamp": result["timestamp"],
            "accuracies": []
        }

        for chapter in result["chapters"]:
            test_data["accuracies"].append(chapter["chapter_accuracy"])

        chapter_accuracy_comparison["tests"].append(test_data)

        for chapter in result["chapters"]:
            for section in chapter["sections"]:
                section_name = f"{chapter['chapter_name']} - {section['section_name']}"
                if section_name not in section_accuracy_history["labels"]:
                    section_accuracy_history["labels"].append(section_name)

                dataset = next(
                    (ds for ds in section_accuracy_history["datasets"] if ds["label"] == result["timestamp"]), None)
                if not dataset:
                    dataset = {"label": result["timestamp"], "data": []}
                    section_accuracy_history["datasets"].append(dataset)

                dataset["data"].append(section["section_accuracy"])

    for result in results:
        for chapter in result["chapters"]:
            for section in chapter["sections"]:
                section_name = f"{chapter['chapter_name']} - {section['section_name']}"
                if section_name not in section_accuracy:
                    section_accuracy[section_name] = []
                section_accuracy[section_name].append(section["section_accuracy"])

                for error in section["errors"]:
                    word = error["correct_word"]
                    if word not in error_ranking:
                        error_ranking[word] = {
                            "count": 0,
                            "details": {
                                "meaning": error["meaning"],
                                "chapter": chapter["chapter_name"],
                                "section": section["section_name"]
                            }
                        }
                    error_ranking[word]["count"] += 1

    latest_section_accuracies = {section: acc[-1] for section, acc in section_accuracy.items()}
    sorted_errors = sorted(error_ranking.items(), key=lambda x: x[1]["count"], reverse=True)

    # 统计全测试次数、自定义测试次数、总时间和总正确率
    full_test_count = len(full_test_results)
    custom_test_count = len(results) - full_test_count

    total_duration_seconds = sum(
        int(result["duration"].split("分")[0]) * 60 + int(result["duration"].split("分")[1].split("秒")[0])
        for result in results
    )
    total_minutes = total_duration_seconds // 60
    total_seconds = total_duration_seconds % 60

    total_accuracy = sum(result["total_accuracy"] for result in results) / len(results) if results else 0

    return jsonify({
        "overallAccuracy": overall_accuracy,
        "chapterAccuracyComparison": chapter_accuracy_comparison,
        "sectionAccuracy": {
            "labels": list(latest_section_accuracies.keys()),
            "values": list(latest_section_accuracies.values())
        },
        "sectionAccuracyHistory": section_accuracy_history,
        "errorRanking": [{"word": word, "count": info["count"], "details": info["details"]} for word, info in
                         sorted_errors],
        "summary": {
            "message": None,
            "fullTestCount": full_test_count,
            "customTestCount": custom_test_count,
            "totalDuration": f"{total_minutes}分{total_seconds}秒",
            "totalAccuracy": total_accuracy,
            "bestSection": max(latest_section_accuracies, key=latest_section_accuracies.get, default="N/A"),
            "bestSectionAccuracy": max(latest_section_accuracies.values(), default=0),
            "worstSection": min(latest_section_accuracies, key=latest_section_accuracies.get, default="N/A"),
            "worstSectionAccuracy": min(latest_section_accuracies.values(), default=0)
        }
    })


@app.route('/save_test_data', methods=['POST'])
def save_test_data():
    data = request.json
    results_file = 'test_results.json'

    if os.path.exists(results_file):
        with open(results_file, 'r', encoding='utf-8') as file:
            existing_data = json.load(file)
    else:
        existing_data = []

    existing_data.append(data)

    with open(results_file, 'w', encoding='utf-8') as file:
        json.dump(existing_data, file, ensure_ascii=False, indent=4)

    return jsonify({'success': True})


def load_countdown_data():
    if os.path.exists(COUNTDOWN_FILE):
        with open(COUNTDOWN_FILE, 'r') as f:
            return json.load(f)
    return {"date": None, "event": None}


def save_countdown_data(date, event):
    with open(COUNTDOWN_FILE, 'w') as f:
        json.dump({'date': date, 'event': event}, f)


@app.route('/get_countdown_data')
def get_countdown_data():
    data = load_countdown_data()
    return jsonify(data)


@app.route('/save_countdown_data', methods=['POST'])
def save_countdown_data_route():
    data = request.json
    save_countdown_data(data['date'], data['event'])
    return jsonify({'success': True})


def natural_sort_key(s):
    """用于自然排序的密钥生成函数"""
    return [int(text) if text.isdigit() else text.lower() for text in re.split('(\d+)', s)]


@app.route('/latest_errors')
def latest_errors():
    results = load_results()
    latest_sections = {}

    for result in results:
        for chapter in result['chapters']:
            chapter_name = chapter['chapter_name']
            for section in chapter['sections']:
                section_name = section['section_name']
                key = (chapter_name, section_name)
                if key not in latest_sections or latest_sections[key]['timestamp'] < result['timestamp']:
                    latest_sections[key] = {
                        'timestamp': result['timestamp'],
                        'chapter_name': chapter_name,
                        'section_name': section_name,
                        'section_accuracy': section['section_accuracy'],
                        'errors': section['errors']
                    }

    sorted_chapters = {}
    for key, data in sorted(latest_sections.items(), key=lambda x: (
            natural_sort_key(x[1]['chapter_name']), natural_sort_key(x[1]['section_name']))):
        chapter_name = data['chapter_name']
        if chapter_name not in sorted_chapters:
            sorted_chapters[chapter_name] = []
        sorted_chapters[chapter_name].append(data)

    indexed_chapters = [
        {
            "chapter_name": chapter_name,
            "chapter_index": chapter_index,
            "sections": [
                {
                    "section_index": section_index,
                    "section_name": section['section_name'],
                    "section_accuracy": round(section['section_accuracy'], 2),
                    "timestamp": section['timestamp'],
                    "errors": section['errors']
                }
                for section_index, section in enumerate(sections)
            ]
        }
        for chapter_index, (chapter_name, sections) in enumerate(sorted_chapters.items())
    ]

    return render_template('latest_errors.html', chapters=indexed_chapters)



# IELTS Page
SCORES_FILE = 'ielts_scores.json'
TARGETS_FILE = 'ielts_targets.json'


def load_scores():
    if os.path.exists(SCORES_FILE):
        with open(SCORES_FILE, 'r') as f:
            return json.load(f)
    return []


def save_scores(scores):
    with open(SCORES_FILE, 'w') as f:
        json.dump(scores, f, ensure_ascii=False, indent=4)


def load_targets():
    if os.path.exists(TARGETS_FILE):
        with open(TARGETS_FILE, 'r') as f:
            return json.load(f)
    return {
        "listening_target": 6.5,
        "reading_target": 6.5,
        "writing_target": 6.5,
        "speaking_target": 6.5,
        "total_target": 6.5
    }


def save_targets(targets):
    with open(TARGETS_FILE, 'w') as f:
        json.dump(targets, f, ensure_ascii=False, indent=4)


# 定义 score_color 函数
def score_color(score):
    if score < 5.0:
        return 'red'
    elif score < 6.0:
        return 'gray'
    elif score <= 6.5:
        return 'blue'
    else:
        return 'gold'


@app.route('/ielts_page')
def ielts_page():
    scores = load_scores()
    targets = load_targets()

    # 根据测试日期进行降序排列，确保最新的分数排在最前
    scores.sort(key=lambda x: datetime.strptime(x['test_date'], '%Y-%m-%d %H:%M:%S'), reverse=True)

    # 生成概览数据
    overview_data = generate_overview_data(scores, targets)

    return render_template('ielts_page.html', scores=scores, targets=targets, score_color=score_color, **overview_data)

@app.route('/get_scores', methods=['GET'])
def get_scores():
    scores = load_scores()
    targets = load_targets()  # 确保加载了 targets
    return jsonify({"scores": scores, "targets": targets})  # 一起返回 scores 和 targets


@app.route('/delete_score/<test_date>', methods=['DELETE'])
def delete_score(test_date):
    scores = load_scores()
    updated_scores = [score for score in scores if score['test_date'] != test_date]

    if len(updated_scores) == len(scores):
        return jsonify({"error": "Score not found"}), 404

    save_scores(updated_scores)
    return jsonify({"success": True})


@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.json  # 获取前端发送的JSON数据

    listening_correct = int(data.get('listening_correct'))
    reading_correct = int(data.get('reading_correct'))
    writing_score = round(float(data.get('writing_score')) * 2) / 2  # 0.5步长
    speaking_score = round(float(data.get('speaking_score')) * 2) / 2  # 0.5步长

    # 限制听力和阅读正确题数在 0 到 40
    if listening_correct < 0 or listening_correct > 40 or reading_correct < 0 or reading_correct > 40:
        return jsonify({"error": "Listening and Reading scores must be between 0 and 40"}), 400

    listening_score = calculate_listening_score(listening_correct)
    reading_score = calculate_reading_score(reading_correct)
    total_score = (listening_score + reading_score + writing_score + speaking_score) / 4

    new_score = {
        "test_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "listening_score": listening_score,
        "reading_score": reading_score,
        "writing_score": writing_score,
        "speaking_score": speaking_score,
        "total_score": round(total_score * 2) / 2  # 0.5步长
    }

    scores = load_scores()
    scores.append(new_score)
    save_scores(scores)

    return jsonify({"success": True, "scores": scores})


@app.route('/submit_targets', methods=['POST'])
def submit_targets():
    targets = {
        "listening_target": float(request.json['listening_target']),
        "reading_target": float(request.json['reading_target']),
        "writing_target": float(request.json['writing_target']),
        "speaking_target": float(request.json['speaking_target']),
        "total_target": float(request.json['total_target'])
    }

    save_targets(targets)

    return jsonify({"success": True, "targets": targets})


def calculate_listening_score(correct_count):
    score_mapping = {
        39: 9.0, 37: 8.5, 35: 8.0, 33: 7.5, 30: 7.0,
        27: 6.5, 23: 6.0, 20: 5.5, 16: 5.0, 13: 4.5
    }
    for correct, score in sorted(score_mapping.items(), reverse=True):
        if correct_count >= correct:
            return score
    return 1.0


def calculate_reading_score(correct_count):
    return calculate_listening_score(correct_count)


def generate_overview_data(scores, targets):
    if not scores:
        return {
            "current_gap_text": "N/A",
            "predicted_score": "N/A",
            "best_subject": "N/A",
            "focus_subject": "N/A"
        }

    latest_score = scores[-1]
    current_gap = {
        "listening": targets['listening_target'] - latest_score['listening_score'],
        "reading": targets['reading_target'] - latest_score['reading_score'],
        "writing": targets['writing_target'] - latest_score['writing_score'],
        "speaking": targets['speaking_target'] - latest_score['speaking_score'],
        "total": targets['total_target'] - latest_score['total_score']
    }

    # 构建自然语言的差距文本
    current_gap_text = (
        f"Listening: {'+' if current_gap['listening'] >= 0 else ''}{current_gap['listening']:.1f}, "
        f"Reading: {'+' if current_gap['reading'] >= 0 else ''}{current_gap['reading']:.1f}, "
        f"Writing: {'+' if current_gap['writing'] >= 0 else ''}{current_gap['writing']:.1f}, "
        f"Speaking: {'+' if current_gap['speaking'] >= 0 else ''}{current_gap['speaking']:.1f}, "
        f"Overall: {'+' if current_gap['total'] >= 0 else ''}{current_gap['total']:.1f}"
    )

    # 简单预测，取最近几次的平均分
    predicted_score = sum(score['total_score'] for score in scores[-5:]) / min(len(scores), 5)

    best_subject = max(current_gap, key=lambda subject: -current_gap[subject])
    focus_subject = min(current_gap, key=lambda subject: current_gap[subject])

    return {
        "current_gap_text": current_gap_text,
        "predicted_score": round(predicted_score * 2) / 2,
        "best_subject": best_subject,
        "focus_subject": focus_subject
    }
# end



if __name__ == '__main__':
    create_tables()  # 创建数据库表
    os.environ['FLASK_ENV'] = 'production'
    app.run(host=config['HOST'], port=config['PORT'], debug=config['DEBUG'])
