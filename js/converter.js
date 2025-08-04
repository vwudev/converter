// Video to GIF functions
function initVideoConverter() {
    const ffmpeg = createFFmpeg({ log: true });
    let ffmpegLoaded = false;

    const videoInput = document.getElementById('videoInput');
    const videoBtn = document.getElementById('convertVideoBtn');
    const videoStatus = document.getElementById('videoStatus');
    const gifDownload = document.getElementById('gifDownload');
    const videoPreview = document.getElementById('videoPreview');
    let selectedVideo = null;

    async function initFFmpeg() {
        try {
            if (!ffmpegLoaded) {
                videoStatus.textContent = 'Đang tải FFmpeg...';
                await ffmpeg.load();
                ffmpegLoaded = true;
                videoStatus.textContent = 'FFmpeg đã sẵn sàng!';
            }
        } catch (error) {
            console.error('Lỗi khi tải FFmpeg:', error);
            videoStatus.textContent = 'Lỗi khi tải FFmpeg!';
        }
    }

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        
        selectedVideo = e.target.files[0];
        if (!selectedVideo.type.match('video.*')) {
            alert('Vui lòng chọn file video!');
            return;
        }
        
        const videoURL = URL.createObjectURL(selectedVideo);
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block'; // Hiển thị video preview
        
        videoStatus.textContent = 'Video đã chọn: ' + selectedVideo.name;
        gifDownload.style.display = 'none';
        
        // Thêm sự kiện để giải phóng URL khi video không còn được sử dụng
        videoPreview.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(videoURL);
        }, { once: true });
    });

    videoBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Vui lòng chọn video trước!');
            return;
        }
        
        try {
            videoBtn.disabled = true;
            gifDownload.style.display = 'none';
            
            videoStatus.textContent = 'Đang xử lý, vui lòng chờ...';
            await initFFmpeg();

            // Lắng nghe sự kiện tiến trình của FFmpeg
            ffmpeg.setProgress(({ ratio }) => {
                if (ratio < 1) {
                    const progress = Math.round(ratio * 100);
                    videoStatus.textContent = `Đang chuyển đổi: ${progress}%`;
                }
            });
            
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(selectedVideo));
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-t', '5',
                '-vf', 'fps=10,scale=640:-1:flags=lanczos',
                '-f', 'gif',
                'output.gif'
            );
            
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

  async function initFFmpeg() {
    try {
      if (!ffmpegLoaded) {
        videoStatus.textContent = 'Đang tải FFmpeg...';
        await ffmpeg.load();
        ffmpegLoaded = true;
        videoStatus.textContent = 'FFmpeg đã sẵn sàng!';
      }
    } catch (error) {
      console.error('Lỗi khi tải FFmpeg:', error);
      videoStatus.textContent = 'Lỗi khi tải FFmpeg!';
    }
  }

  videoInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    
    selectedVideo = e.target.files[0];
    if (!selectedVideo.type.match('video.*')) {
      alert('Vui lòng chọn file video!');
      return;
    }
    
    videoPreview.src = URL.createObjectURL(selectedVideo);
    videoStatus.textContent = 'Video đã chọn: ' + selectedVideo.name;
    gifDownload.style.display = 'none';
  });

  videoBtn.addEventListener('click', async () => {
    if (!selectedVideo) {
      alert('Vui lòng chọn video trước!');
      return;
    }
    
    try {
      videoBtn.disabled = true;
      videoStatus.textContent = 'Đang xử lý...';
      
      await initFFmpeg();
      
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(selectedVideo));
      await ffmpeg.run(
        '-i', 'input.mp4',
        '-t', '5',
        '-vf', 'fps=10,scale=640:-1:flags=lanczos',
        '-f', 'gif',
        'output.gif'
      );
      
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

  // Format mapping
  const formatOptions = [
    { value: 'png', text: 'PNG', from: ['jpg', 'jpeg', 'webp'] },
    { value: 'jpg', text: 'JPG', from: ['png', 'webp'] },
    { value: 'webp', text: 'WEBP', from: ['png', 'jpg', 'jpeg'] }
  ];

  // Dynamic format selection based on input
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    
    selectedImg = e.target.files[0];
    const fileExt = selectedImg.name.split('.').pop().toLowerCase();
    
    if (!selectedImg.type.match('image.*')) {
      alert('Vui lòng chọn file ảnh hợp lệ!');
      return;
    }
    
    // Update format options based on input
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
