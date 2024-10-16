document.addEventListener('DOMContentLoaded', () => {
    fetch('/get_analysis_data')
        .then(response => response.json())
        .then(data => {
            renderOverallAccuracyChart(data.overallAccuracy);
            renderChapterAccuracyComparisonChart(data.chapterAccuracyComparison);
            renderSectionAccuracyBarChart(data.sectionAccuracy);
            renderSectionAccuracyComparisonChart(data.sectionAccuracyHistory);
            renderErrorRankingList(data.errorRanking);
            renderDataSummary(data.summary);
            populateSectionSelect(data.sectionAccuracy.labels);  // 填充小节选择框
        });

    // 初始化帮助图标的提示框
    initHelpTooltips();

    // 监听小节选择变化
    document.getElementById('section-select').addEventListener('change', handleSectionSelectChange);
});

function populateSectionSelect(sectionLabels) {
    const sectionSelect = document.getElementById('section-select');
    sectionLabels.sort(naturalSort);  // 对小节名称进行排序
    sectionLabels.forEach(label => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        sectionSelect.appendChild(option);
    });
}

function handleSectionSelectChange() {
    const sectionSelect = document.getElementById('section-select');
    const selectedSection = sectionSelect.value;
    const chartContainer = document.getElementById('section-trend-chart');

    if (!selectedSection) {
        chartContainer.style.display = 'none';  // 隐藏图表
        return;
    }

    fetch(`/get_section_trend_data?section=${encodeURIComponent(selectedSection)}`)
        .then(response => response.json())
        .then(data => {
            renderSectionTrendChart(data.labels, data.values);
            chartContainer.style.display = 'block';  // 显示图表
        });
}

function renderSectionTrendChart(labels, values) {
    const ctx = document.getElementById('section-trend-chart').getContext('2d');

    if (window.sectionTrendChart) {
        window.sectionTrendChart.destroy();  // 如果已存在图表，先销毁它
    }

    window.sectionTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '正确率',
                data: values,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}


function renderSectionAccuracyComparisonChart(sectionComparisonData) {
    const ctx = document.getElementById('section-comparison-chart').getContext('2d');
    const datasets = sectionComparisonData.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        fill: false
    }));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sectionComparisonData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderOverallAccuracyChart(accuracyData) {
    const ctx = document.getElementById('accuracy-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: accuracyData.labels,
            datasets: [{
                label: '总正确率',
                data: accuracyData.values,
                borderColor: 'rgba(74, 144, 226, 1)',
                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderChapterAccuracyComparisonChart(chapterComparisonData) {
    const ctx = document.getElementById('chapter-comparison-chart').getContext('2d');
    const datasets = chapterComparisonData.tests.map((test, index) => ({
        label: test.timestamp,
        data: test.accuracies,
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        fill: false
    }));
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chapterComparisonData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderSectionAccuracyBarChart(sectionAccuracy) {
    const sortedLabels = sectionAccuracy.labels.slice().sort(naturalSort);
    const sortedValues = sortedLabels.map(label => {
        const index = sectionAccuracy.labels.indexOf(label);
        return sectionAccuracy.values[index];
    });

    const ctx = document.getElementById('section-accuracy-bar-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: '平均正确率',
                data: sortedValues,
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderErrorRankingList(errorRanking) {
    const list = document.getElementById('error-ranking-list');
    list.innerHTML = '';
    errorRanking.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.word}: ${item.count} 次错误`;
        li.classList.add('clickable');
        li.addEventListener('click', () => toggleErrorDetails(li, item.details));
        list.appendChild(li);
    });
}

function toggleErrorDetails(listItem, details) {
    let detailsDiv = listItem.querySelector('.error-details');

    if (!detailsDiv) {
        detailsDiv = document.createElement('div');
        detailsDiv.classList.add('error-details');
        detailsDiv.innerHTML = `<p>${details.meaning}</p><p>来自: ${details.chapter} - ${details.section}</p>`;
        listItem.appendChild(detailsDiv);
    }

    if (detailsDiv.style.height && detailsDiv.style.height !== '0px') {
        detailsDiv.style.height = `${detailsDiv.scrollHeight}px`;
        detailsDiv.offsetHeight;
        detailsDiv.style.height = '0px';
        detailsDiv.style.opacity = '0';
        detailsDiv.style.paddingTop = '0';
        detailsDiv.style.paddingBottom = '0';
        detailsDiv.style.marginTop = '0';
        detailsDiv.style.borderWidth = '0';
    } else {
        detailsDiv.style.display = 'block';
        detailsDiv.style.height = 'auto';
        const height = detailsDiv.scrollHeight;
        detailsDiv.style.height = '0px';
        detailsDiv.offsetHeight;
        detailsDiv.style.height = `${height}px`;
        detailsDiv.style.opacity = '1';
        detailsDiv.style.paddingTop = '10px';
        detailsDiv.style.paddingBottom = '10px';
        detailsDiv.style.marginTop = '10px';
        detailsDiv.style.borderWidth = '1px';
    }
}

function renderDataSummary(summary) {
    const summaryDiv = document.getElementById('data-summary');

    if (summary.message) {
        summaryDiv.innerHTML = `<h2>${summary.message}</h2>`;
        return;
    }

    summaryDiv.innerHTML = `
        <h2>目前</h2>
        <p id="full-tests" style="opacity: 0;">完成全测试次数: ${summary.fullTestCount}</p>
        <p id="custom-tests" style="opacity: 0;">完成自定义测试次数: ${summary.customTestCount}</p>
        <p id="total-duration" style="opacity: 0;">共练习时间: ${summary.totalDuration}</p>
        <p id="total-accuracy" style="opacity: 0;">总正确率: ${summary.totalAccuracy.toFixed(2)}%</p>
        <p id="best-section" style="opacity: 0;">表现最好的小节: ${summary.bestSection} - 正确率是: ${summary.bestSectionAccuracy.toFixed(2)}%</p>
        <p id="worst-section" style="opacity: 0;">表现最糟的小节: ${summary.worstSection} - 正确率是: ${summary.worstSectionAccuracy.toFixed(2)}%</p>
    `;

    const delay = 300;
    setTimeout(() => { document.getElementById('full-tests').style.opacity = 1; }, delay);
    setTimeout(() => { document.getElementById('custom-tests').style.opacity = 1; }, delay * 2);
    setTimeout(() => { document.getElementById('total-duration').style.opacity = 1; }, delay * 3);
    setTimeout(() => { document.getElementById('total-accuracy').style.opacity = 1; }, delay * 4);
    setTimeout(() => { document.getElementById('best-section').style.opacity = 1; }, delay * 5);
    setTimeout(() => { document.getElementById('worst-section').style.opacity = 1; }, delay * 6);
}

function naturalSort(a, b) {
    const aParts = a.match(/(\d+|\D+)/g);
    const bParts = b.match(/(\d+|\D+)/g);

    while (aParts.length && bParts.length) {
        const aPart = aParts.shift();
        const bPart = bParts.shift();

        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);

        if (isNaN(aNum) || isNaN(bNum)) {
            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        } else {
            if (aNum > bNum) return 1;
            if (aNum < bNum) return -1;
        }
    }
    return aParts.length - bParts.length;
}

function initHelpTooltips() {
    const infoIcons = document.querySelectorAll('.help-icon');
    infoIcons.forEach(icon => {
        const tooltip = icon.querySelector('.tooltip');
        icon.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-50%) translateX(0)';
        });
        icon.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(-50%) translateX(10px)';
        });
    });
}