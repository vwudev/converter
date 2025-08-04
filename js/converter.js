// Video to GIF functions
async function initVideoConverter() {
    // Kiểm tra xem FFmpeg có sẵn sàng không
    if (typeof createFFmpeg === 'undefined' || typeof fetchFile === 'undefined') {
        console.error('FFmpeg libraries not loaded!');
        document.getElementById('videoStatus').textContent = 'Lỗi: Thư viện FFmpeg chưa được tải. Vui lòng tải lại trang.';
        return;
    }

    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ 
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });
    
    let ffmpegLoaded = false;
    let conversionStartTime;

    const videoInput = document.getElementById('videoInput');
    const videoBtn = document.getElementById('convertVideoBtn');
    const videoStatus = document.getElementById('videoStatus');
    const gifDownload = document.getElementById('gifDownload');
    const videoPreview = document.getElementById('videoPreview');
    const progressBar = document.getElementById('progressBar');
    let selectedVideo = null;

    async function loadFFmpeg() {
        if (!ffmpegLoaded) {
            videoStatus.textContent = 'Đang tải FFmpeg... (lần đầu có thể mất vài giây)';
            try {
                await ffmpeg.load();
                ffmpegLoaded = true;
                videoStatus.textContent = 'FFmpeg đã sẵn sàng! Chọn video để bắt đầu.';
                console.log('FFmpeg loaded successfully');
            } catch (error) {
                console.error('Lỗi khi tải FFmpeg:', error);
                videoStatus.textContent = 'Lỗi khi tải FFmpeg: ' + error.message;
            }
        }
    }

    // Tải FFmpeg ngay khi trang được mở
    loadFFmpeg();

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        
        selectedVideo = e.target.files[0];
        if (!selectedVideo.type.match('video.*')) {
            alert('Vui lòng chọn file video hợp lệ (MP4, MOV, AVI...)');
            return;
        }
        
        const videoURL = URL.createObjectURL(selectedVideo);
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block';
        
        videoStatus.textContent = `Video đã chọn: ${selectedVideo.name} (${(selectedVideo.size / 1024 / 1024).toFixed(2)}MB)`;
        gifDownload.style.display = 'none';
        progressBar.style.display = 'none';
        
        videoPreview.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(videoURL);
        }, { once: true });
    });

    videoBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Vui lòng chọn video trước khi chuyển đổi!');
            return;
        }
        
        if (!ffmpegLoaded) {
            alert('FFmpeg chưa sẵn sàng, vui lòng chờ...');
            return;
        }

        try {
            videoBtn.disabled = true;
            gifDownload.style.display = 'none';
            progressBar.style.display = 'block';
            progressBar.value = 0;
            conversionStartTime = Date.now();
            
            videoStatus.textContent = 'Đang bắt đầu quá trình chuyển đổi...';
            
            ffmpeg.setProgress(({ ratio }) => {
                const progress = Math.round(ratio * 100);
                const elapsed = (Date.now() - conversionStartTime) / 1000;
                let eta = 'Đang tính...';
                
                if (ratio > 0.1 && ratio < 1) {
                    const totalTime = elapsed / ratio;
                    const remainingTime = totalTime - elapsed;
                    eta = `${Math.floor(remainingTime / 60)}m ${Math.floor(remainingTime % 60)}s còn lại`;
                }
                
                videoStatus.textContent = `Đang chuyển đổi: ${progress}% - ${eta}`;
                progressBar.value = progress;
            });

            // Ghi file video vào bộ nhớ FFmpeg
            videoStatus.textContent = 'Đang đọc video...';
            await ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(selectedVideo));

            // Chạy lệnh FFmpeg để chuyển đổi
            videoStatus.textContent = 'Đang chuyển đổi video sang GIF...';
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-t', '10', // Giới hạn 10 giây
                '-vf', 'fps=15,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                '-loop', '0',
                'output.gif'
            );

            // Đọc kết quả
            videoStatus.textContent = 'Đang tạo file GIF...';
            const data = ffmpeg.FS('readFile', 'output.gif');
            
            // Tạo URL để tải về
            const blob = new Blob([data.buffer], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);

            gifDownload.href = url;
            gifDownload.download = selectedVideo.name.replace(/\.[^/.]+$/, '') + '.gif';
            gifDownload.style.display = 'inline-block';
            progressBar.value = 100;
            videoStatus.textContent = '✅ Chuyển đổi thành công! Nhấn vào nút tải để lấy GIF.';
            
        } catch (error) {
            console.error('Lỗi khi chuyển đổi:', error);
            videoStatus.textContent = '❌ Lỗi khi chuyển đổi: ' + (error.message || 'Xảy ra lỗi không xác định');
            progressBar.style.display = 'none';
        } finally {
            videoBtn.disabled = false;
        }
    });
}

// Image Converter functions 
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
