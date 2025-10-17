import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Upload, Download, Image as ImageIcon, FileCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressionRatio, setCompressionRatio] = useState(0);
  const [loading, setLoading] = useState(false);
  const [originalFormat, setOriginalFormat] = useState("");

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      
      setSelectedFile(file);
      setOriginalSize(file.size);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      
      setCompressedBlob(null);
      setCompressedSize(0);
      setCompressionRatio(0);
    }
  };

  const compressImage = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/compress`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const compSize = parseInt(response.headers['x-compressed-size'] || '0');
      const ratio = parseFloat(response.headers['x-compression-ratio'] || '0');
      const origFormat = response.headers['x-original-format'] || 'UNKNOWN';
      
      setCompressedBlob(response.data);
      setCompressedSize(compSize);
      setCompressionRatio(ratio);
      setOriginalFormat(origFormat);
      
      toast.success("Image compressed successfully!");
    } catch (error) {
      console.error('Compression error:', error);
      toast.error("Failed to compress image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!compressedBlob) return;

    const url = window.URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.name.split('.')[0]}.webp`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success("Image downloaded!");
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressedBlob(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressionRatio(0);
    setOriginalFormat("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/40 border-b border-white/20 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Swift Compress
              </h1>
              <p className="text-xs text-gray-600">Convert to WebP • High Quality</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Compress Your Images</h2>
            <p className="text-gray-600">Upload any image format and convert it to high-quality WebP</p>
          </div>

          {/* Upload Area */}
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-upload-input"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl p-12 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300"
              data-testid="file-upload-label"
            >
              <Upload className="w-16 h-16 text-blue-500 mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Click to upload image</p>
              <p className="text-sm text-gray-500">Supports JPG, PNG, GIF, BMP, TIFF and more</p>
            </label>
          </div>

          {/* Preview and Actions */}
          {selectedFile && (
            <div className="mt-8">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Original Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-700">Original Image</h3>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Original"
                      className="w-full h-64 object-contain"
                      data-testid="original-image-preview"
                    />
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">File:</span> {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Size:</span> {formatBytes(originalSize)}
                    </p>
                    {originalFormat && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Format:</span> {originalFormat}
                      </p>
                    )}
                  </div>
                </div>

                {/* Compressed Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-700">Compressed (WebP)</h3>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border-2 border-green-200 bg-gray-50">
                    {compressedBlob ? (
                      <img
                        src={URL.createObjectURL(compressedBlob)}
                        alt="Compressed"
                        className="w-full h-64 object-contain"
                        data-testid="compressed-image-preview"
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-gray-400">
                        <p>Compressed image will appear here</p>
                      </div>
                    )}
                  </div>
                  {compressedBlob && (
                    <div className="bg-green-50 rounded-lg p-3 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Size:</span> {formatBytes(compressedSize)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Format:</span> WebP
                      </p>
                      <p className="text-sm font-semibold text-green-600">
                        Reduced by {compressionRatio}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={compressImage}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                  data-testid="compress-button"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Compress to WebP
                    </>
                  )}
                </Button>

                {compressedBlob && (
                  <Button
                    onClick={downloadImage}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                    data-testid="download-button"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download WebP
                  </Button>
                )}

                <Button
                  onClick={resetAll}
                  variant="outline"
                  className="px-8 py-6 text-lg rounded-xl border-2"
                  data-testid="reset-button"
                >
                  Reset
                </Button>
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="mt-6">
                  <Progress value={66} className="h-2" />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="backdrop-blur-md bg-white/60 border-white/40 p-6 text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">High Quality</h3>
            <p className="text-sm text-gray-600">95% quality retention ensures your images look perfect</p>
          </Card>

          <Card className="backdrop-blur-md bg-white/60 border-white/40 p-6 text-center">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">WebP Format</h3>
            <p className="text-sm text-gray-600">Modern format with superior compression and quality</p>
          </Card>

          <Card className="backdrop-blur-md bg-white/60 border-white/40 p-6 text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">All Formats</h3>
            <p className="text-sm text-gray-600">Support for JPG, PNG, GIF, BMP, TIFF and more</p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-600 text-sm">
        <p>Created by Aadesh Sawant • Swift Compress © 2025</p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
```

---
