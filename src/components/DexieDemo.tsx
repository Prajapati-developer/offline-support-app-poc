import React, { useEffect, useRef, useState } from "react";
import Dexie from "dexie";
import Webcam from "react-webcam";
import { deflateSync, inflateSync } from "fflate";
// import { compressSync, decompressSync, strToU8, strFromU8 } from "fflate";
const db = new Dexie("react-dexie-demo");
db.version(1).stores({
  images:
    "++id, name, type, data, fileSize, blobSize, compressedSize,timestamp",
  pdfs: "++id, name, type, data,fileSize, blobSize, compressedSize, timestamp",
  attachments: "++id, type, name, data, timestamp",
  postApiData: "++id, name, data, timestamp",
});
const compressBlob = async (blob: Blob): Promise<Uint8Array> => {
  const buffer = await blob.arrayBuffer();


  return deflateSync(new Uint8Array(buffer), { level: 10 });
};

const decompressToBlob = (compressed, type) => {

  const decompressed = inflateSync(compressed);

  return new Blob([decompressed], { type });
};



const DexieDemo = () => {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [OriginalStorageUsed, setOriginalStorageUsed] = useState(0);
  const [CompressedStorageUsed, setCompressedStorageUsed] = useState(0);
  const [apiItems, setApiItems] = useState([]);
  const [localDataOriginalSize, setLocalDataOriginalSize] = useState(0);
  const [deviceBrowserStorageQuota, setDeviceBrowserStorageQuota] = useState(0);
  const [deviceBrowserStorageUsed, setDeviceBrowserStorageUsed] = useState(0);
  const webcamRef = useRef(null);
  const [error, setError] = useState(null); 

 

  const loadAttachments = async () => {
    const pdfData = await db.pdfs.orderBy("timestamp").reverse().toArray();
    const imageData = await db.images.orderBy("timestamp").reverse().toArray();
    const allApiData = await db.postApiData
      .orderBy("timestamp")
      .reverse()
      .toArray();

    const compressedImageBytes = imageData.reduce(
      (sum, img) => sum + (img.compressedSize || 0),
      0
    );
    const originalImageBytes = imageData.reduce(
      (sum, img) => sum + (img.fileSize || 0),
      0
    );
    const compressedPdfBytes = pdfData.reduce(
      (sum, pdf) => sum + (pdf.compressedSize || 0),
      0
    );
    const originalPdfBytes = pdfData.reduce(
      (sum, pdf) => sum + (pdf.fileSize || 0),
      0
    );
    const apiDataBytes = allApiData.reduce((sum, item) => {
      return sum + new TextEncoder().encode(JSON.stringify(item.data)).length;
    }, 0);
    setApiItems(allApiData[0]?.data);
    // setAttachments(all);
    setAttachments({ images: imageData, pdfs: pdfData });
    // setStorageUsed(imageBytes + apiDataBytes + pdfBytes);
    setLocalDataOriginalSize(apiDataBytes);
    setCompressedStorageUsed(compressedImageBytes + compressedPdfBytes);
    setOriginalStorageUsed(originalImageBytes + originalPdfBytes);

    if ("storage" in navigator && "estimate" in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate();
  
      // usage and quota might be undefined or null, default to 0
      setDeviceBrowserStorageQuota(quota || 0);
      setDeviceBrowserStorageUsed(usage || 0);
  
      // console.log("usage", usage, "quota", quota);
    }
  };
 

  const formatBytes = (bytes) => {
    if (bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
    if (bytes < 1024 ** 4) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    return `${(bytes / (1024 ** 4)).toFixed(2)} TB`;
  };

  const deleteApiItem = async (id) => {
    await db.postApiData.delete(id);
    loadAttachments();
  };
  
  const fetchAndSaveApiData = async () => {
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts"
      );
      const post = await response.json();
      const existing = await db.postApiData
        .where("name")
        .equals("Posts")
        .first();

      if (existing) {
        await db.postApiData.update(existing.id, {
          data: post,
          timestamp: Date.now(),
        });
      } else {
        await db.postApiData.add({
          name: `Posts`,
          data: post,
          timestamp: Date.now(),
        });
      }
      // }
      // await db.postApiData.add({
      //   name: `Posts`,
      //   data,
      //   timestamp: Date.now(),
      // });

      loadAttachments();
    } catch (error) {
      console.error("failed", error);
    }
  };
  useEffect(() => {
    loadAttachments();
  }, []);

  const handleFileUpload = async (e) => {
    setLoading(true);
    try {
    const file = e.target.files[0];
    if (!file) return;

    const compressedData = await compressBlob(file);
    // const compressedBlob = new Blob([compressedData], { type: 'application/deflate' });

    if (file.type.startsWith("image/")) {
      await db.images.add({
        name: file.name,
        type: file.type,
        data: compressedData,
        fileSize: file.size,

        compressedSize: compressedData.length,
        timestamp: Date.now(),
      });
    } else if (file.type === "application/pdf") {
      await db.pdfs.add({
        name: file.name,
        type: file.type,
        data: compressedData,
        fileSize: file.size,

        compressedSize: compressedData.length,
        timestamp: Date.now(),
      });
    }

    await loadAttachments();
    // setLoading(false);
  }catch (err) {
    console.error("Dexie handleFileUpload error:", err);
    setError(err.message || "Failed to upload file.");
  } finally {
    setLoading(false);
  }

  };

  
  const captureFromWebcam = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    try {
    const res = await fetch(imageSrc);
    setLoading(true);
    const blob = await res.blob();
    const compressedData = await compressBlob(blob);
    await db.images.add({
      name: `webcam-${Date.now()}.png`,
      type: "image/png",
      data: compressedData,
      fileSize: blob.size,

      compressedSize: compressedData.length,
      timestamp: Date.now(),
    });

    setCameraOn(false);
    await loadAttachments();
    // setLoading(false);
  } catch (err) {
    console.error("Dexie handleFileUpload error:", err);
    setError(err.message || "Failed to upload file.");
  }finally{
    setLoading(false);
  }
  };

  const clearAll = async () => {
    await db.images.clear();
    await db.pdfs.clear();
    await db.postApiData.clear();
    loadAttachments();
  };
  const deleteImage = async (id) => {
    await db.images.delete(id);
    loadAttachments();
  };

  const deletePdf = async (id) => {
    await db.pdfs.delete(id);
    loadAttachments();
  };
  return (
    <div style={{ padding: 20 }}>
      <h2>Attachment</h2>
      {error && (
  <div style={{  marginBottom: 20}}>
    <strong>Error:</strong> {error}
  </div>
)}
      {/* <p style={{ marginTop: 10 }}>
        Available Browser Storage :
        <strong>{formatBytes(deviceBrowserStorageQuota)}</strong>
    
      </p>
      <p style={{ marginTop: 10 }}>
        Used Browser Storage :
        <strong>{formatBytes(deviceBrowserStorageUsed)}</strong>
     
      </p>
      <hr></hr> */}
      <p style={{ marginTop: 10 }}>
        Original Storage used:
        <strong>{formatBytes(OriginalStorageUsed)}</strong>
      </p>
      <p style={{ marginTop: 10 }}>
        Compressed Storage used:
        <strong>{formatBytes(CompressedStorageUsed)}</strong>
      </p>
      {/* <p style={{ marginTop: 10 }}>
        Compressed Storage used: <strong>{formatBytes(CompressedStorageUsed)}</strong>
      </p> */}

      <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} />
      <button onClick={() => setCameraOn(true)} style={{ marginLeft: 10 }}>
        Open Webcam
      </button>
      <button onClick={clearAll} style={{ marginLeft: 10 }}>
        Clear All
      </button>
      <button onClick={fetchAndSaveApiData} style={{ marginLeft: 10 }}>
        Fetch API Data
      </button>
      <p>
        {loading
          ? "saving data to localstorage please wait......"
          : "data saved successfully"}
      </p>
      {cameraOn && (
        <div style={{ marginTop: 20 }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/png"
            width={300}
            videoConstraints={{ facingMode: "environment" }}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={captureFromWebcam}> Capture</button>
            <button
              onClick={() => setCameraOn(false)}
              style={{ marginLeft: 10 }}
            >
              Close Webcam
            </button>
          </div>
        </div>
      )}

      <div>
        {/* {attachments.map((att) => {
          
         
          return (
          <div key={att.id} style={{ margin: 10 }}>
            {att.type.startsWith("image") ? (
              <img
                src={att.data }
                alt={att.name}
                style={{ width: 100, borderRadius: 4 }}
              />
            ) : (
              <a href={att.data  } download={att.name}>
                {att.name}
              </a>
            )}
            <button onClick={() => deleteAttachment(att.id)}> Delete</button>
          </div>
        )})} */}
        <div>
          <h3>Images</h3>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {attachments?.images?.map((att) => {
              if (!(att.data instanceof Uint8Array)) return null;
              const blob = decompressToBlob(att.data, att.type);
              const objectUrl = URL.createObjectURL(blob);
              return (
                <div key={att.id} style={{ margin: 10 }}>
                  <img src={objectUrl} alt={att.name} style={{ width: 100 }} />
                  <div>Original File Size: {formatBytes(att.fileSize)}</div>
                  <div>
                    Compressed File Size: {formatBytes(att.compressedSize)}
                  </div>

                  <button onClick={() => deleteImage(att.id)}>Delete</button>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h3>PDFs</h3>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {attachments.pdfs?.map((att) => {
              if (!(att.data instanceof Uint8Array)) return null;
              const blob = decompressToBlob(att.data, att.type);
              const objectUrl = URL.createObjectURL(blob);
              return (
                <div key={att.id} style={{ margin: 10 }}>
                  <a href={objectUrl} download={att.name}>
                    {att.name}
                  </a>

                  <div>Original File Size: {formatBytes(att.fileSize)}</div>
                  <div>
                    Compressed File Size: {formatBytes(att.compressedSize)}
                  </div>

                  <button onClick={() => deletePdf(att.id)}>Delete</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {apiItems && apiItems?.length > 0 && (
        <>
          <h3>API Data</h3>
          <>
            {apiItems.map((item) => (
              <p key={item.id} style={{ marginBottom: 10, display: "flex" }}>
                <strong>{item.title}</strong>
                <button onClick={() => deleteApiItem(item.id)}>Delete</button>
              </p>
            ))}
          </>
        </>
      )}
    </div>
  );
};

export default DexieDemo;
