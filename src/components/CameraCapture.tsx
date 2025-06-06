import { useEffect, useRef, useState } from 'react';
import { db } from '../utils/db';
import { deflateSync, inflateSync } from 'fflate';

const compressBlob = async (blob: Blob): Promise<Uint8Array> => {
    const buffer = await blob.arrayBuffer();

    // return compressSync(new Uint8Array(buffer),{ level: 6, mem: 12});
    return deflateSync(new Uint8Array(buffer), { level: 6 });
};

const decompressToBlob = (compressed, type) => {
    // const arrayBuffer = await compressed.arrayBuffer();
    // const decompressed = decompressSync(new Uint8Array(arrayBuffer));
    // return new Blob([decompressed], { type });
    // const decompressed = decompressSync(compressed);
    const decompressed = inflateSync(compressed);

    return new Blob([decompressed], { type });
};


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

    // Helper to convert Blob to ArrayBuffer
    const blobToArrayBuffer = async (blob) => {
        if (!(blob instanceof Blob)) {
            console.error("blobToArrayBuffer received non-Blob:", blob);
            throw new TypeError('Expected a Blob');
        }

        // return new Promise((resolve, reject) => {
        //     const reader = new FileReader();
        //     reader.onload = () => resolve(reader.result);
        //     reader.onerror = reject;
        //     reader.readAsArrayBuffer(blob);
        // });
    };



    const capture = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
            console.log('blob: ', blob);
            const blobs = new Blob([await blob.arrayBuffer()], { type: blob.type });

            const compressedUint8Array = await compressBlob(blobs);
            const compressedBlob = new Blob([compressedUint8Array], { type: 'images/*' });

            await db.put({
                _id: blob.name,
                _attachments: {
                    [blob.name]: {
                        content_type: 'images/*',
                        data: compressedBlob // ✅
                    }
                }
            });

            setImageUrl(URL.createObjectURL(blob));
            viewAllDocs();
        }, 'image/jpeg');


    };

    const viewAllDocs = async () => {
        const allDocs = await db.allDocs({
            include_docs: true,
            attachments: true,
            // binary: true
        });

        let totalSize = 0;
        const files = [];
        console.log("allDocs.rows", allDocs.rows);
        for (const row of allDocs.rows) {
            console.log('row: ', row);
            const attachments = row.doc._attachments;
            if (attachments) {
                for (const [name, attachment] of Object.entries(attachments)) {
                    console.log('attachment: ', attachment);
                    const blob = decompressToBlob(attachment, "application/pdf");
                    const objectUrl = URL.createObjectURL(blob);

                    files.push({
                        id: row.id,
                        objectUrl,
                        name: name,
                        type: attachment.content_type,
                        compressedSize: row.doc.compressedSize,
                        originalSize: row.doc.originalSize
                    });

                }
            }
        }
        setTotal(totalSize);
        console.log('Total data size:', totalSize / 1024, 'KB');
        console.log('All offline data:', allDocs);
        setData(files); // now includes both images and PDFs
        console.log('files: ', files);
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
        console.log('file: ', file);
        if (!file || file.type !== 'application/pdf') return;

        const id = new Date().toISOString();

        const blob = new Blob([await file.arrayBuffer()], { type: file.type });

        const compressedUint8Array = await compressBlob(blob);
        const compressedBlob = new Blob([compressedUint8Array], { type: 'application/pdf' });

        await db.put({
            _id: id,
            compressedSize: formatBytes(compressedBlob.size) || 10,
            originalSize: formatBytes(file.size) || 10,
            _attachments: {
                [file.name]: {
                    content_type: 'application/pdf',
                    data: compressedBlob,
                }
            }
        });
        alert('PDF uploaded and saved offline.');
        viewAllDocs();
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
                    {item.type.includes('pdf') ? (
                        <>
                            <a href={item.objectUrl} target="_blank" rel="noopener noreferrer">
                                {item.name}
                            </a>
                            <div>Original File Size: {item.originalSize}</div>
                            <div>Compressed File Size: {item.compressedSize}</div>
                        </>
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
