import React, { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import jsQR from 'jsqr';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [lastFrame, setLastFrame] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const decodeProductData = (encodedData) => {
    try {
      const padding = '='.repeat((4 - (encodedData.length % 4)) % 4);
      const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const decoded = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding data:', error);
      throw new Error('Invalid QR code format');
    }
  };
  const b64_to_utf8 = (str) => {
    try {
      return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (error) {
      console.error('Decoding error for string:', str);
      throw error;
    }
  };
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        if (mounted) setStream(mediaStream);
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) setError('Unable to access camera: ' + err.message);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(err => {
      console.error('Video play error:', err);
      setError('Failed to start video: ' + err.message);
    });

    // Process frames every 500ms
    const interval = setInterval(() => {
      try {
        if (!canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Process frames with jsQR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        
        if (code) {
          try {
            const decodedString = b64_to_utf8(code.data);
            const productData = JSON.parse(decodedString);
            console.log('Decoded product:', productData); // For debugging
            
            onScan(productData);
            clearInterval(interval);
          } catch (error) {
            console.error('Error decoding QR:', error);
            // Continue scanning if decode fails
          }
        }
        // For debugging - display the last frame timestamp
        const now = new Date().toISOString();
        setLastFrame(now);

      } catch (err) {
        console.error('Frame processing error:', err);
        setError('Frame processing failed: ' + err.message);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [stream, onScan]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {error ? (
          <div className="text-red-500 text-center py-4">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 opacity-0"
            />
            <div className="absolute inset-0 border-2 border-blue-500 opacity-50">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500 animate-scan" />
            </div>
            {lastFrame && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                Last frame: {lastFrame}
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-600">
          Position the QR code within the frame
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;