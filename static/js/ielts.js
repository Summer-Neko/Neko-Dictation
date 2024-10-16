document.addEventListener('DOMContentLoaded', () => {
    // 初始化趋势图
    const ctxTotal = document.getElementById('totalScoreChart').getContext('2d');
    const totalScoreChart = createChartWithTarget(ctxTotal, 'Total Score', 7.0); // 假设目标分数是 7.0

    const ctxListening = document.getElementById('listeningTrendChart').getContext('2d');
    const listeningTrendChart = createChartWithTarget(ctxListening, 'Listening Score', 6.5); // 假设目标分数是 6.5

    const ctxReading = document.getElementById('readingTrendChart').getContext('2d');
    const readingTrendChart = createChartWithTarget(ctxReading, 'Reading Score', 6.0); // 假设目标分数是 6.0

    const ctxWriting = document.getElementById('writingTrendChart').getContext('2d');
    const writingTrendChart = createChartWithTarget(ctxWriting, 'Writing Score', 6.5); // 假设目标分数是 6.5

    const ctxSpeaking = document.getElementById('speakingTrendChart').getContext('2d');
    const speakingTrendChart = createChartWithTarget(ctxSpeaking, 'Speaking Score', 7.0); // 假设目标分数是 7.0

    const ctxOverview = document.getElementById('overviewChart').getContext('2d');
    const overviewChart = createOverviewChart(ctxOverview);

    // 提交成绩表单
    document.getElementById('scoreForm').addEventListener('submit', function(e) {
        e.preventDefault();  // 阻止默认提交行为

        const formData = new FormData(this);
        const data = {
            listening_correct: formData.get('listening_correct'),
            reading_correct: formData.get('reading_correct'),
            writing_score: formData.get('writing_score'),
            speaking_score: formData.get('speaking_score')
        };

        // 提交数据到后端
        fetch('/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Scores submitted successfully!');

                // 获取最新的成绩并更新图表
                fetch('/get_scores')
                .then(response => response.json())
                .then(data => {
                    const scores = data.scores;

                    // 更新所有图表
                    updateChart(totalScoreChart, scores, 'total_score', 7.0);
                    updateChart(listeningTrendChart, scores, 'listening_score', 6.5);
                    updateChart(readingTrendChart, scores, 'reading_score', 6.0);
                    updateChart(writingTrendChart, scores, 'writing_score', 6.5);
                    updateChart(speakingTrendChart, scores, 'speaking_score', 7.0);

                    // 如果有概览图表，更新概览图表
                    const lastSixScores = scores.slice(-6);
                    const overviewData = lastSixScores.map(score => ({
                        label: score.test_date,
                        data: [score.listening_score, score.reading_score, score.writing_score, score.speaking_score],
                        borderColor: randomColor(),
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        fill: false
                    }));

                    overviewChart.data.datasets = overviewData;
                    overviewChart.update();
                })
                .catch(error => {
                    console.error('Error fetching updated scores:', error);
                });
            } else if (data.error) {
                alert(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });



    // 创建图表的通用函数，带有目标分数线
    function createChartWithTarget(ctx, label, targetScore) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true
                },
                // 目标分数线
                {
                    label: 'Target Score',
                    data: [],  // 这里稍后会将目标分数填充到每个日期
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderDash: [10, 5],  // 虚线表示
                    fill: false
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 9,  // IELTS 分数最高为 9
                        stepSize: 0.5
                    }
                }
            }
        });
    }

    // 创建概览图表
    function createOverviewChart(ctx) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Listening', 'Reading', 'Writing', 'Speaking'],
                datasets: []
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 9,
                        stepSize: 0.5
                    }
                }
            }
        });
    }

    // 更新图表时同时更新目标分数线
    function updateChart(chart, scores, scoreKey, targetScore) {
        const labels = scores.map(score => score.test_date);
        const data = scores.map(score => score[scoreKey]);

        // 更新图表数据
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;

        // 为目标分数线填充数据（与日期对应的目标分数）
        chart.data.datasets[1].data = labels.map(() => targetScore);  // 为每个日期都设置同样的目标分数
        chart.update();
    }

    // 获取成绩数据并更新图表
    fetch('/get_scores').then(response => response.json()).then(data => {
        const scores = data.scores
        const targets = data.targets;
        updateChart(totalScoreChart, scores, 'total_score', targets.total_target);
        updateChart(listeningTrendChart, scores, 'listening_score', targets.listening_target);
        updateChart(readingTrendChart, scores, 'reading_score', targets.reading_target);
        updateChart(writingTrendChart, scores, 'writing_score', targets.writing_target);
        updateChart(speakingTrendChart, scores, 'speaking_score', targets.speaking_target);

        // 更新概览图表
        const lastSixScores = scores.slice(-6);
        const overviewData = lastSixScores.map(score => ({
            label: score.test_date,
            data: [score.listening_score, score.reading_score, score.writing_score, score.speaking_score],
            borderColor: randomColor(),
            backgroundColor: 'rgba(0, 123, 255, 0.2)',
            fill: false
        }));

        overviewChart.data.datasets = overviewData;
        overviewChart.update();
    });

    function randomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 1)`;
    }

    // 展开趋势子菜单但不显示trend内容
    window.toggleSubMenu = function(subMenuId) {
        const subMenu = document.getElementById(`${subMenuId}-submenu`);
        subMenu.style.display = subMenu.style.display === 'none' ? 'block' : 'none';
        subMenu.classList.toggle('animated-slide');
    };

    // 点击小节显示所有trend内容并滚动定位到对应图表
    window.showAndScrollToChart = function(chartId) {
    // 隐藏所有section
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // 显示指定的图表
    const targetChartSection = document.getElementById(chartId);
    if (targetChartSection) {
        targetChartSection.style.display = 'block';

        // 滚动到指定图表
        const offset = targetChartSection.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
        console.error(`Element with ID ${chartId} not found.`);
    }
};

    // 页面切换逻辑
    window.showSection = function(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
    };

    // 默认显示概览页面
    showSection('overview');
});

// 删除分数记录
    function deleteScore(testDate) {
        if (!confirm("Are you sure you want to delete this score?")) {
            return;  // 用户取消操作
        }

        fetch(`/delete_score/${testDate}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Score deleted successfully!');
                // 重新加载页面或更新分数列表
                window.location.reload();  // 简单的方式重新加载页面
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the score.');
        });
    }