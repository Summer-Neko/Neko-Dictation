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

                // 添加图片加载错误处理
                img.onerror = () => {
                    console.error(`Failed to load image: ${img.src}, retrying...`);
                    img.src = img.dataset.src; // 尝试重新加载图片
                };

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
    const photoViewer = document.getElementById('photo-viewer');
    const photoViewerImg = document.getElementById('photo-viewer-img');

    // 设置图片源并显示照片查看器
    photoViewerImg.src = img.dataset.src || img.src;
    photoViewerImg.style.maxHeight = '90vh'; // 确保照片适应视窗的高度
    photoViewerImg.style.maxWidth = '90vw'; // 确保照片适应视窗的宽度

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

    // 压缩并上传图片
    const uploadForms = document.querySelectorAll('.upload-form');
    uploadForms.forEach(form => {
        form.addEventListener('submit', function (event) {
            event.preventDefault(); // 阻止默认提交

            const fileInput = form.querySelector('input[type="file"]');
            const files = fileInput.files;
            const formData = new FormData();

            if (files.length > 0) {
                const promises = Array.from(files).map(file => {
                    const maxSize = 2 * 1024 * 1024; // 2MB
                    if (file.size <= maxSize) {
                        // 文件小于等于2MB，不压缩，直接添加到formData
                        formData.append('photos', file, file.name);
                        return Promise.resolve(); // 直接返回成功的Promise
                    } else {
                        // 文件大于2MB，进行压缩
                        return new Promise(resolve => {
                            compressImage(file, 2048, 2048, 0.9, (compressedBlob) => {
                                formData.append('photos', compressedBlob, file.name);
                                resolve(); // 压缩完成后，resolve Promise
                            });
                        });
                    }
                });
                // 所有图片处理完毕后再进行上传
                Promise.all(promises).then(() => {
                    // 在压缩完成后上传文件
                    fetch(form.action, {
                        method: 'POST',
                        body: formData
                    }).then(response => {
                        if (response.ok) {
                            window.location.reload(); // 上传成功后刷新页面
                        } else {
                            alert('上传失败');
                        }
                    }).catch(error => console.error('上传错误:', error));
                });
            }
        });
    });

    function compressImage(file, maxWidth, maxHeight, quality, callback) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;

            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    } else {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(function(blob) {
                    callback(blob);
                }, 'image/jpeg', quality);
            };
        };
        reader.readAsDataURL(file);
    }

// 打开任务浮窗
    const openModalButton = document.getElementById('open-task-modal');
    const modal = document.getElementById('task-modal');
    const closeModalButton = modal.querySelector('.close-button');
    const taskContainer = document.getElementById('task-container');
    const addTaskButton = document.getElementById('add-task');

    openModalButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 重新绑定添加任务按钮点击事件
    addTaskButton.addEventListener('click', () => {
        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.name = 'task_content';
        taskInput.placeholder = '输入任务内容';
        taskInput.classList.add('task-input');
        taskContainer.appendChild(taskInput);
    });

});