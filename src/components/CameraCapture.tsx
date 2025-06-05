// CameraCapture.js
import { useRef, useState } from 'react';
import { db } from '../utils/db';

const CameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [data, setData] = useState([]);

    const startCamera = async () => {
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
    };

    const viewAllDocs = async () => {
        const allDocs = await db.allDocs({
            include_docs: true,
            attachments: true,
            binary: true
        });
        let totalSize = 0;
        const images = [];

        for (const row of allDocs.rows) {
            const attachments = row.doc._attachments;
            if (attachments) {
                for (const [name, attachment] of Object.entries(attachments)) {
                    if (attachment.data instanceof Blob) {
                        totalSize += attachment.data.size;
                        images.push({
                            id: row.id,
                            url: URL.createObjectURL(attachment.data),
                            name
                        });
                    } else if (typeof attachment.data === 'string') {
                        // Base64 fallback
                        const base64Length = attachment.data.length;
                        totalSize += Math.ceil((base64Length * 3) / 4);
                        const url = `data:${attachment.content_type};base64,${attachment.data}`;
                        images.push({
                            id: row.id,
                            url,
                            name
                        });
                    }
                }
            }
        }

        console.log('Total data size:', totalSize / 1024, 'KB');
        console.log('All offline data:', allDocs);
        setData(images); // now an array of {id, url, name}
    };
    const clearData = async()=>{
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
    return (
        <div>
            
            <video ref={videoRef} autoPlay style={{ width: '100%' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={startCamera}>Start Camera</button>
            <button onClick={capture}>Capture</button>
            <button onClick={clearData}>Clear</button>
            <button onClick={viewAllDocs} style={{ marginLeft: '1rem' }}>View Saved Images (Console)</button>
            {/* {imageUrl && <img src={imageUrl} alt="Captured" width="300" />} */}

            <div style={{ marginTop: '2rem' }}>
                <h3>Saved Images</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {data.map((img) => (
                        <div key={img.id} style={{ textAlign: 'center' }}>
                            <img src={img.url} alt={img.name} width="150" />
                            <p style={{ fontSize: '0.75rem' }}>{img.name}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>

    );
};

export default CameraCapture;
