// Upload utility with fallback mechanisms
export class FileUploader {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async uploadFile(file, onProgress = null) {
    try {
      // First, try the signed URL approach
      const signedUrlResult = await this.trySignedUrlUpload(file, onProgress);
      if (signedUrlResult.success) {
        return signedUrlResult;
      }
    } catch (error) {
      console.warn('Signed URL upload failed, trying direct upload:', error);
    }

    // Fallback to direct upload
    return await this.directUpload(file, onProgress);
  }

  async trySignedUrlUpload(file, onProgress) {
    // Step 1: Get signed URL
    const urlResponse = await fetch(`${this.baseUrl}/api/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type
      })
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      if (errorData.fallback === 'direct_upload') {
        throw new Error('Fallback to direct upload');
      }
      throw new Error(`Failed to get upload URL: ${errorData.error}`);
    }

    const { uploadUrl, publicUrl, filename } = await urlResponse.json();

    // Step 2: Upload to signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
      // Add progress tracking if supported
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    return {
      success: true,
      publicUrl,
      filename,
      method: 'signed_url'
    };
  }

  async directUpload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              publicUrl: response.publicUrl,
              filename: response.filename,
              method: 'direct_upload'
            });
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}/api/upload-url`);
      xhr.send(formData);
    });
  }
}

// React hook for file uploads
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploader = useMemo(() => new FileUploader(), []);

  const uploadFile = async (file) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploader.uploadFile(file, (progressPercent) => {
        setProgress(progressPercent);
      });

      setUploading(false);
      setProgress(100);
      return result;
    } catch (err) {
      setUploading(false);
      setError(err.message);
      throw err;
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
    error,
    resetError: () => setError(null)
  };
}

// Simple function-based approach
export async function uploadFileSimple(file, onProgress = null) {
  const uploader = new FileUploader();
  return await uploader.uploadFile(file, onProgress);
}

// Batch upload utility
export async function uploadMultipleFiles(files, onProgress = null) {
  const uploader = new FileUploader();
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploader.uploadFile(file, (fileProgress) => {
        if (onProgress) {
          const totalProgress = ((i / files.length) * 100) + (fileProgress / files.length);
          onProgress(totalProgress, i + 1, files.length);
        }
      });
      results.push({ file: file.name, ...result });
    } catch (error) {
      results.push({
        file: file.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}