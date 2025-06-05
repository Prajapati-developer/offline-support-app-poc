// CameraCapture.js
import { useEffect, useRef, useState } from 'react';
import { db } from '../utils/db';

const CameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [data, setData] = useState([]);
    const [total, setTotal] = useState()
    const [startCameraFlag, setStartCameraFlag] = useState(false);
    const startCamera = async () => {
        setStartCameraFlag(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
    };

    const capture = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
            const id = new Date().toISOString();

            // Save the image as an attachment in PouchDB
            await db.put({
                _id: id,
                _attachments: {
                    'photo.jpg': {
                        content_type: 'image/jpeg',
                        data: blob
                    }
                }
            });

            // Display preview
            setImageUrl(URL.createObjectURL(blob));
        }, 'image/jpeg');
        viewAllDocs();
    };

    const viewAllDocs = async () => {
        const allDocs = await db.allDocs({
            include_docs: true,
            attachments: true,
            binary: true
        });

        let totalSize = 0;
        const files = [];

        for (const row of allDocs.rows) {
            const attachments = row.doc._attachments;
            if (attachments) {
                for (const [name, attachment] of Object.entries(attachments)) {
                    let url = '';
                    let type = '';

                    if (attachment.data instanceof Blob) {
                        totalSize += attachment.data.size;
                        url = URL.createObjectURL(attachment.data);
                    } else if (typeof attachment.data === 'string') {
                        const base64Length = attachment.data.length;
                        totalSize += Math.ceil((base64Length * 3) / 4);
                        url = `data:${attachment.content_type};base64,${attachment.data}`;
                    }

                    // Determine file type from content_type
                    if (attachment.content_type === 'application/pdf') {
                        type = 'pdf';
                    } else if (attachment.content_type.startsWith('image/')) {
                        type = 'image';
                    } else {
                        type = 'unknown';
                    }

                    files.push({
                        id: row.id,
                        url,
                        name,
                        type
                    });
                }
            }
        }

        setTotal(totalSize);
        console.log('Total data size:', totalSize / 1024, 'KB');
        console.log('All offline data:', allDocs);
        setData(files); // now includes both images and PDFs
    };

    const formatBytes = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
        if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
        return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
    };

    const clearData = async () => {
        try {
            //   const doc = await db.get('camera-data');   
            //   console.log("doc",doc)   
            //   await db.remove(doc);      
            await db.destroy();
            console.log(`deleted the users data from localstorage`);
        } catch (err) {
            console.error(`failed`, err);
        }

    }
    useEffect(() => {
        viewAllDocs()
    }, [])

    const handlePdfUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        const id = new Date().toISOString();

        await db.put({
            _id: id,
            _attachments: {
                'document.pdf': {
                    content_type: 'application/pdf',
                    data: file
                }
            }
        });

        alert('PDF uploaded and saved offline.');
    };

    return (
        <div>
            <p style={{ marginTop: 10 }}>
                Storage used: <strong>{total && formatBytes(total)}</strong>
            </p>
            <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ marginTop: '1rem' }}
            />
            {startCameraFlag && <video ref={videoRef} autoPlay style={{ width: '100%' }} />}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={startCamera}>Start Camera</button>
            <button onClick={capture}>Capture</button>
            <button onClick={clearData}>Clear</button>
            <button onClick={viewAllDocs} style={{ marginLeft: '1rem' }}>View Saved Images (Console)</button>
            {/* {imageUrl && <img src={imageUrl} alt="Captured" width="300" />} */}

            {data.map((item) => (
                <div key={item.id} style={{ textAlign: 'center' }}>
                    {item.type === 'pdf' ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                            📄 {item.name}
                        </a>
                    ) : (
                        <img src={item.url} alt={item.name} width="150" />
                    )}
                    <p style={{ fontSize: '0.75rem' }}>{item.name}</p>
                </div>
            ))}

        </div>

    );
};

export default CameraCapture;
