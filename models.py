# models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    content = db.Column(db.Text, nullable=False)
    photo_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(1), nullable=True)  # Status: 'S', 'A', 'B', 'C'

    def __repr__(self):
        return f'<Schedule {self.date}>'


class AdminFeedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    rating = db.Column(db.String(1), nullable=False)  # Rating: 'S', 'A', 'B', 'C'
    feedback = db.Column(db.Text, nullable=True)

    schedule = db.relationship('Schedule', backref='feedbacks')

    def __repr__(self):
        return f'<AdminFeedback {self.rating}>'