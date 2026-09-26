
"use client";
import Image from 'next/image';

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

const QRCode: React.FC<QRCodeProps> = ({ data, size = 150, className }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&qzone=1`;
  // qzone=1 adds a quiet zone border
  return (
    <div className={className}>
      <Image 
        src={qrUrl} 
        alt="QR Code" 
        width={size} 
        height={size} 
        className="rounded-md shadow-md"
        unoptimized // Since it's an external dynamic image
      />
    </div>
  );
};

export default QRCode;
