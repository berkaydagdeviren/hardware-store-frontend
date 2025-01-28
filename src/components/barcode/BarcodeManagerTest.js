import React from 'react';
import QRCode from 'qrcode';

const SettingsView = () => {
  const testProducts = [
    {
      _id: "m16x50",
      code: "M16X50AKB",
      name: "M16X50 Akb Civata",
      price: 15.50,
      price2: 14.25,
      KDV_ORANI: 20
    },
    {
      _id: "fib6",
      code: "FİB6",
      name: "6'lı Fiber",
      price: 8.75,
      price2: 8.00,
      KDV_ORANI: 20
    }
  ];

  const handleDownloadTestQRs = async () => {
    try {
      // Generate individual QR codes
      const generateQR = async (product) => {
        // Convert product to URL-safe string
        const productString = encodeURIComponent(JSON.stringify(product));
        const qr = await QRCode.toDataURL(productString, {
          type: 'image/png',
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'L',
          scale: 8
        });
        return qr;
      };

      const qrDataUrls = await Promise.all(testProducts.map(generateQR));

      // Create SVG containing all QR codes
      const qrSize = 200;
      const labelHeight = 40;
      const padding = 20;
      const pageWidth = (qrSize + padding) * 2;
      const pageHeight = ((qrSize + labelHeight + padding) * Math.ceil(testProducts.length / 2));

      let svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">
          ${qrDataUrls.map((dataUrl, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col * (qrSize + padding);
            const y = row * (qrSize + labelHeight + padding);
            const product = testProducts[index];

            return `
              <g transform="translate(${x},${y})">
                <image href="${dataUrl}" width="${qrSize}" height="${qrSize}" />
                <text x="${qrSize/2}" y="${qrSize + 20}" text-anchor="middle" font-size="14" font-weight="bold">${product.name}</text>
                <text x="${qrSize/2}" y="${qrSize + 35}" text-anchor="middle" font-size="12">${product.code}</text>
              </g>
            `;
          }).join('')}
        </svg>
      `;

      // Download the SVG
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-qrcodes.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Error generating QR codes: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Barcode Management</h2>
        <div className="mb-6">
          <button
            onClick={handleDownloadTestQRs}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Download Test QR Codes (M16X50AKB & FİB6)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;