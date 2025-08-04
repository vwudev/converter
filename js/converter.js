// Video to GIF Converter - Phiên bản GitHub Pages
async function initVideoConverter() {
    const ffmpeg = window.ffmpeg;
    const fetchFile = window.fetchFile;
    
    // Các phần tử UI
    const videoInput = document.getElementById('videoInput');
    const videoBtn = document.getElementById('convertVideoBtn');
    const videoStatus = document.getElementById('videoStatus');
    const gifDownload = document.getElementById('gifDownload');
    const videoPreview = document.getElementById('videoPreview');
    const progressBar = document.getElementById('progressBar');
    const videoInfo = document.getElementById('videoInfo');
    const videoDuration = document.getElementById('videoDuration');
    
    let selectedVideo = null;
    let conversionStartTime;

    // Xử lý chọn file video
    videoInput.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        
        selectedVideo = e.target.files[0];
        
        // Kiểm tra file
        if (!selectedVideo.type.match('video.*')) {
            alert('Vui lòng chọn file video (MP4, MOV, AVI)');
            return;
        }
        
        // Kiểm tra kích thước file (tối đa 10MB)
        if (selectedVideo.size > 10 * 1024 * 1024) {
            alert('File video quá lớn (tối đa 10MB)');
            return;
        }
        
        // Hiển thị video preview
        const videoURL = URL.createObjectURL(selectedVideo);
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block';
        videoInfo.style.display = 'block';
        
        // Hiển thị thông tin video
        videoStatus.textContent = `Đã chọn: ${selectedVideo.name} (${(selectedVideo.size/1024/1024).toFixed(1)}MB)`;
        gifDownload.style.display = 'none';
        progressBar.style.display = 'none';
        
        // Lấy thời lượng video
        videoPreview.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(videoPreview.duration);
            videoDuration.textContent = duration;
            
            if (duration > 10) {
                videoStatus.textContent += ` - Chỉ 10 giây đầu sẽ được chuyển đổi`;
            }
            
            URL.revokeObjectURL(videoURL);
        }, { once: true });
    });

    // Xử lý nút chuyển đổi
    videoBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Vui lòng chọn video trước!');
            return;
        }
        
        if (!ffmpeg || !ffmpeg.loaded) {
            alert('Công cụ chuyển đổi chưa sẵn sàng, vui lòng chờ...');
            return;
        }

        try {
            // Thiết lập trạng thái ban đầu
            videoBtn.disabled = true;
            gifDownload.style.display = 'none';
            progressBar.style.display = 'block';
            progressBar.value = 0;
            conversionStartTime = Date.now();
            
            videoStatus.textContent = 'Đang bắt đầu quá trình chuyển đổi...';
            
            // Thiết lập progress callback
            ffmpeg.setProgress(({ ratio }) => {
                const progress = Math.round(ratio * 100);
                const elapsed = (Date.now() - conversionStartTime) / 1000;
                let eta = 'Đang tính...';
                
                if (ratio > 0.1 && ratio < 1) {
                    const totalTime = elapsed / ratio;
                    const remainingTime = totalTime - elapsed;
                    eta = `${Math.floor(remainingTime)} giây còn lại`;
                }
                
                videoStatus.textContent = `Đang xử lý: ${progress}% (${eta})`;
                progressBar.value = progress;
            });

            // Bước 1: Đọc file video
            videoStatus.textContent = 'Đang đọc video...';
            const fileData = await fetchFile(selectedVideo);
            await ffmpeg.FS('writeFile', 'input.mp4', fileData);

            // Bước 2: Chuyển đổi sang GIF
            videoStatus.textContent = 'Đang chuyển đổi...';
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-t', '10', // Giới hạn 10 giây
                '-vf', 'fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                '-loop', '0',
                'output.gif'
            );

            // Bước 3: Lấy kết quả
            videoStatus.textContent = 'Đang tạo file GIF...';
            const data = ffmpeg.FS('readFile', 'output.gif');
            
            // Tạo link download
            const blob = new Blob([data.buffer], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);
            gifDownload.href = url;
            gifDownload.download = selectedVideo.name.replace(/\.[^/.]+$/, '') + '.gif';
            
            // Hiển thị kết quả
            gifDownload.style.display = 'inline-block';
            progressBar.value = 100;
            videoStatus.innerHTML = '✅ Chuyển đổi thành công! <i class="fas fa-check-circle"></i>';
            
        } catch (error) {
            console.error('Lỗi chuyển đổi:', error);
            videoStatus.innerHTML = `❌ Lỗi: ${error.message || 'Xảy ra lỗi trong quá trình chuyển đổi'}`;
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
// Xử lý menu mobile
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  menuToggle.addEventListener('click', function() {
    navMenu.classList.toggle('active');
    menuToggle.innerHTML = navMenu.classList.contains('active') 
      ? '<i class="fas fa-times"></i>' 
      : '<i class="fas fa-bars"></i>';
  });
  
  // Đóng menu khi click vào mục menu
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
  });
});
