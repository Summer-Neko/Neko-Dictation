document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img.lazy');
    const photoViewer = document.getElementById('photo-viewer');
    const photoViewerImg = document.getElementById('photo-viewer-img');
    const prevPhotoButton = document.getElementById('prev-photo');
    const nextPhotoButton = document.getElementById('next-photo');
    const closeButton = document.querySelector('.close-button');
    let currentPhotoIndex = 0;
    let currentGallery = [];
    let startX = 0;


    const lazyLoad = (target) => {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);  // 停止观察该图片
                }
            });
        });

        observer.observe(target);
    };

    lazyImages.forEach(lazyLoad);

    // 照片点击放大功能
window.viewPhoto = function(img) {
        currentGallery = Array.from(img.closest('.photo-container').querySelectorAll('img'));
        currentPhotoIndex = currentGallery.indexOf(img);
        openPhotoViewer(currentPhotoIndex);
    };

    function openPhotoViewer(index) {
        const img = currentGallery[index];
        photoViewerImg.src = img.src;
        photoViewer.classList.remove('hidden');
    }

    function closePhotoViewer() {
        photoViewer.classList.add('hidden');
        photoViewerImg.src = '';
    }

    function showPrevPhoto() {
        if (currentPhotoIndex > 0) {
            currentPhotoIndex--;
        } else {
            currentPhotoIndex = currentGallery.length - 1; // 循环到最后一张
        }
        openPhotoViewer(currentPhotoIndex);
    }

    function showNextPhoto() {
        if (currentPhotoIndex < currentGallery.length - 1) {
            currentPhotoIndex++;
        } else {
            currentPhotoIndex = 0; // 循环到第一张
        }
        openPhotoViewer(currentPhotoIndex);
    }

    // 添加点击关闭功能
    photoViewerImg.addEventListener('click', closePhotoViewer);

    // 添加滑动切换功能
    photoViewerImg.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    photoViewerImg.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        if (endX < startX - 50) {
            showNextPhoto(); // 左滑，显示下一张
        } else if (endX > startX + 50) {
            showPrevPhoto(); // 右滑，显示上一张
        }
    });

    closeButton.addEventListener('click', closePhotoViewer);
    prevPhotoButton.addEventListener('click', showPrevPhoto);
    nextPhotoButton.addEventListener('click', showNextPhoto);





    // 删除日程按钮样式
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // 阻止默认表单提交
            if (confirm('确定要驳回这个日程吗？')) {
                button.closest('form').submit(); // 提交表单
            }
        });
    });

    // 评分选择弹窗样式
    const ratingButtons = document.querySelectorAll('.rating-button');
    ratingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const rating = button.dataset.rating;
            alert(`选择了评分: ${rating}`);
        });
    });
});