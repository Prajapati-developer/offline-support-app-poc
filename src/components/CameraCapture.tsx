import { useEffect, useRef, useState } from 'react';
import { db } from '../utils/db';
import { deflateSync, inflateSync } from 'fflate';

const compressBlob = async (blob: Blob): Promise<Uint8Array> => {
    const buffer = await blob.arrayBuffer();
    return deflateSync(new Uint8Array(buffer), { level: 6 });
};

const decompressToBlob = (base64OrUint8, type: string) => {
    let compressedData;

    if (typeof base64OrUint8 === 'string') {
        // Decode base64
        const binaryStr = atob(base64OrUint8);
        const len = binaryStr.length;
        compressedData = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            compressedData[i] = binaryStr.charCodeAt(i);
        }
    } else {
        compressedData = base64OrUint8;
    }

    const decompressed = inflateSync(compressedData);
    return new Blob([decompressed], { type });
};

const uint8ArrayToBase64 = (uint8Array) => {
    return new Promise((resolve) => {
        const blob = new Blob([uint8Array]);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(blob);
    });
};


const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

const CameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [data, setData] = useState([]);
    const [totalOriginalSize, setTotalOriginalSize] = useState(0);
    const [totalCompressedSize, setTotalCompressedSize] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const [startCameraFlag, setStartCameraFlag] = useState(false);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = mediaStream;
            setStartCameraFlag(true); // This will render the <video>
        } catch (error) {
            console.error("Camera access failed", error);
        }
    };
    
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStartCameraFlag(false);
    };
    


    const capture = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const id = new Date().toISOString();
            const compressedData = await compressBlob(blob);

            await db.put({
                _id: id,
                originalSize: blob.size,
                compressedSize: compressedData.length,
                _attachments: {
                    [`image-${Date.now()}.jpeg`]: {
                        content_type: blob.type,
                        data: btoa(String.fromCharCode(...compressedData)) // Store as base64
                    }
                }
            });

            viewAllDocs();
        }, 'image/jpeg');
    };

    const handlePdfUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        const id = new Date().toISOString();
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const compressedData = await compressBlob(blob);

        const base64Data = await uint8ArrayToBase64(compressedData); // Safe conversion

        await db.put({
            _id: id,
            originalSize: file.size,
            compressedSize: compressedData.length,
            _attachments: {
                [file.name]: {
                    content_type: 'application/pdf',
                    data: base64Data
                }
            }
        });

        alert('PDF uploaded and saved offline.');
        viewAllDocs();
    };
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const id = new Date().toISOString();
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const compressedData = await compressBlob(blob);
        const base64Data = await uint8ArrayToBase64(compressedData);

        await db.put({
            _id: id,
            originalSize: file.size,
            compressedSize: compressedData.length,
            _attachments: {
                [file.name]: {
                    content_type: file.type,
                    data: base64Data,
                },
            },
        });

        alert('Image uploaded and saved offline.');
        viewAllDocs();
    };


    const viewAllDocs = async () => {
        const allDocs = await db.allDocs({ include_docs: true, attachments: true });

        let totalOriginal = 0;
        let totalCompressed = 0;
        const files = [];

        for (const row of allDocs.rows) {
            const { _attachments, originalSize = 0, compressedSize = 0 } = row.doc;
            totalOriginal += originalSize;
            totalCompressed += compressedSize;

            if (_attachments) {
                for (const [name, attachment] of Object.entries(_attachments)) {
                    const blob = decompressToBlob(attachment.data, attachment.content_type);
                    const url = URL.createObjectURL(blob);

                    files.push({
                        id: `${row.id}__ATTACH__${name}`,
                        url,
                        name,
                        type: attachment.content_type,
                        originalSize,
                        compressedSize
                    });
                }
            }
        }

        setTotalOriginalSize(totalOriginal);
        setTotalCompressedSize(totalCompressed);
        setData(files);
    };

    const clearData = async () => {
        await db.destroy();
        window.location.reload(); // Reset state cleanly
    };

    const deleteItem = async (docId) => {
        try {
            const doc = await db.get(docId);
            await db.remove(doc);
            viewAllDocs(); // Refresh after deletion
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    };

    useEffect(() => {
        viewAllDocs();
        return () => {
            stopCamera(); // Ensure camera stops when component unmounts
        };
    }, []);
    useEffect(() => {
        if (startCameraFlag && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [startCameraFlag]);
    

    return (
        <div>
            <strong>Total Original Size:</strong> {formatBytes(totalOriginalSize)}<br />
            <strong>Total Compressed Size:</strong> {formatBytes(totalCompressedSize)}<br />
            {/* Upload Section */}
            <strong>PDF Upload:</strong><input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ marginTop: '1rem', display: 'block' }}
            />
            <strong>Image Upload:</strong><input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ marginTop: '0.5rem', display: 'block' }}
            />

            {startCameraFlag && <video ref={videoRef} autoPlay style={{ width: '100%' }} />}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
             {/* Control Buttons */}
             <div style={{ marginTop: '1rem' }}>
                <button onClick={startCamera}>Start Camera</button>
                <button onClick={stopCamera} style={{ marginLeft: '0.5rem' }}>Stop Camera</button>
                <button onClick={capture} style={{ marginLeft: '0.5rem' }}>Capture</button>
                <button onClick={clearData} style={{ marginLeft: '0.5rem' }}>Clear</button>
                <button onClick={viewAllDocs} style={{ marginLeft: '0.5rem' }}>View Saved Data</button>
            </div>

            {/* IMAGE SECTION */}
            <h3>Images</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {data.filter(item => !item.type.includes('pdf')).map((item) => (
                    <div key={item.id} style={{ textAlign: 'center', width: '150px' }}>
                        <img src={item.url} alt={item.name} width="150" style={{ borderRadius: 4 }} />
                        <div style={{ fontSize: '0.75rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem' }}>Original: {formatBytes(item.originalSize)}</div>
                        <div style={{ fontSize: '0.75rem' }}>Compressed: {formatBytes(item.compressedSize)}</div>
                        <button onClick={() => deleteItem(item.id.split('__ATTACH__')[0])} style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            Delete
                        </button>
                    </div>
                ))}

            </div>

            {/* PDF SECTION */}
            <h3 style={{ marginTop: '2rem' }}>PDFs</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {data.filter(item => item.type.includes('pdf')).map((item) => (
                    <div key={item.id} style={{ textAlign: 'center', width: '200px' }}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ wordWrap: 'break-word' }}>
                            {item.name}
                        </a>
                        <div style={{ fontSize: '0.75rem' }}>Original: {formatBytes(item.originalSize)}</div>
                        <div style={{ fontSize: '0.75rem' }}>Compressed: {formatBytes(item.compressedSize)}</div>
                        <button onClick={() => deleteItem(item.id.split('__ATTACH__')[0])} style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            Delete
                        </button>

                    </div>
                ))}
            </div>

        </div>
    );
};

export default CameraCapture;
