// Video to GIF functions
function initVideoConverter() {
    // Khai báo các biến và hằng số
    const ffmpeg = createFFmpeg({ log: true });
    let ffmpegLoaded = false;
    let conversionStartTime;

    const videoInput = document.getElementById('videoInput');
    const videoBtn = document.getElementById('convertVideoBtn');
    const videoStatus = document.getElementById('videoStatus');
    const gifDownload = document.getElementById('gifDownload');
    const videoPreview = document.getElementById('videoPreview');
    let selectedVideo = null;

    // Hàm tải FFmpeg
    async function initFFmpeg() {
        if (!ffmpegLoaded) {
            videoStatus.textContent = 'Đang tải FFmpeg... (lần đầu có thể mất vài giây)';
            await ffmpeg.load();
            ffmpegLoaded = true;
            videoStatus.textContent = 'FFmpeg đã sẵn sàng!';
        }
    }

    // Xử lý khi người dùng chọn video
    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        
        selectedVideo = e.target.files[0];
        if (!selectedVideo.type.match('video.*')) {
            alert('Vui lòng chọn file video!');
            return;
        }
        
        const videoURL = URL.createObjectURL(selectedVideo);
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block';
        
        videoStatus.textContent = `Video đã chọn: ${selectedVideo.name}`;
        gifDownload.style.display = 'none';
        
        // Giải phóng URL khi video được tải xong để tiết kiệm bộ nhớ
        videoPreview.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(videoURL);
        }, { once: true });
    });

    // Xử lý khi người dùng bấm nút chuyển đổi
    videoBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Vui lòng chọn video trước!');
            return;
        }
        
        try {
            videoBtn.disabled = true;
            gifDownload.style.display = 'none';
            conversionStartTime = Date.now();
            
            videoStatus.textContent = 'Đang xử lý, vui lòng chờ...';
            await initFFmpeg();

            // Cải tiến thanh tiến độ
            ffmpeg.setProgress(({ ratio }) => {
                const elapsed = (Date.now() - conversionStartTime) / 1000;
                let eta = 'Đang tính...';
                if (ratio > 0.1 && ratio < 1) {
                    const totalTime = elapsed / ratio;
                    const remainingTime = totalTime - elapsed;
                    eta = `${remainingTime.toFixed(1)}s còn lại`;
                }
                const progress = Math.round(ratio * 100);
                videoStatus.textContent = `Đang chuyển đổi: ${progress}% - ETA: ${eta}`;
            });
            
            // Ghi file vào bộ nhớ ảo của FFmpeg
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(selectedVideo));
            
            // Chạy lệnh FFmpeg để chuyển đổi
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-t', '5', // Chuyển đổi 5 giây đầu tiên
                '-vf', 'fps=10,scale=640:-1:flags=lanczos',
                '-f', 'gif',
                'output.gif'
            );
            
            // Đọc và tạo file GIF
            const data = ffmpeg.FS('readFile', 'output.gif');
            const blob = new Blob([data.buffer], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);

            gifDownload.href = url;
            gifDownload.download = selectedVideo.name.replace(/\.[^/.]+$/, '') + '.gif';
            gifDownload.style.display = 'inline-block';
            videoStatus.textContent = '✅ Chuyển đổi thành công!';

        } catch (error) {
            console.error('Lỗi khi chuyển đổi:', error);
            videoStatus.textContent = '❌ Lỗi khi chuyển đổi: ' + error.message;
        } finally {
            videoBtn.disabled = false;
        }
    });
}

// Image Converter functions (đã được giữ nguyên)
function initImageConverter() {
    const imageInput = document.getElementById('imageInput');
    const imageBtn = document.getElementById('convertImageBtn');
    const formatSelect = document.getElementById('imageFormat');
    const imageCanvas = document.getElementById('imageCanvas');
    const imgDownload = document.getElementById('imgDownload');
    const imagePreview = document.getElementById('imagePreview');
    const imageStatus = document.getElementById('imageStatus');
    let selectedImg = null;

    const formatOptions = [
        { value: 'png', text: 'PNG', from: ['jpg', 'jpeg', 'webp'] },
        { value: 'jpg', text: 'JPG', from: ['png', 'webp'] },
        { value: 'webp', text: 'WEBP', from: ['png', 'jpg', 'jpeg'] }
    ];

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        
        selectedImg = e.target.files[0];
        const fileExt = selectedImg.name.split('.').pop().toLowerCase();
        
        if (!selectedImg.type.match('image.*')) {
            alert('Vui lòng chọn file ảnh hợp lệ!');
            return;
        }
        
        formatSelect.innerHTML = '';
        const compatibleFormats = formatOptions.filter(f => f.from.includes(fileExt));
        
        if (compatibleFormats.length === 0) {
            alert('Không có định dạng đích phù hợp!');
            return;
        }
        
        compatibleFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = `image/${format.value}`;
            option.textContent = format.text;
            formatSelect.appendChild(option);
        });
        
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            imageStatus.textContent = `Ảnh đã chọn: ${selectedImg.name}`;
            imgDownload.style.display = 'none';
        };
        reader.readAsDataURL(selectedImg);
    });

    imageBtn.addEventListener('click', async () => {
        if (!selectedImg) {
            alert('Vui lòng chọn ảnh trước!');
            return;
        }
        
        try {
            imageBtn.disabled = true;
            imageStatus.textContent = 'Đang xử lý...';
            
            const img = new Image();
            img.src = URL.createObjectURL(selectedImg);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Không thể tải ảnh'));
            });
            
            const ctx = imageCanvas.getContext('2d');
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const type = formatSelect.value;
            
            imageCanvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('Không thể tạo blob từ ảnh');
                }
                
                const url = URL.createObjectURL(blob);
                imgDownload.href = url;
                const ext = type.split('/')[1];
                imgDownload.download = selectedImg.name.replace(/\.[^/.]+$/, '') + '.' + ext;
                imgDownload.style.display = 'inline-block';
                imageStatus.textContent = `✅ Đã chuyển đổi thành ${ext.toUpperCase()}!`;
            }, type, 0.9);
            
        } catch (error) {
            console.error('Lỗi khi chuyển đổi ảnh:', error);
            imageStatus.textContent = `❌ Lỗi: ${error.message}`;
        } finally {
            imageBtn.disabled = false;
        }
    });
}
