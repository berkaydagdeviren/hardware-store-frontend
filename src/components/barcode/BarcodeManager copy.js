import React, { useState, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

const BarcodeManager = ({ isExpanded }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyUngenerated, setShowOnlyUngenerated] = useState(false);
  const [individualSearch, setIndividualSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://apii-iviq.onrender.com/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isExpanded) {
      fetchProducts();
    }
  }, [isExpanded]);

  // Filter products based on search and ungenerated filter
  useEffect(() => {
    let filtered = [...products];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.code?.toLowerCase().includes(searchLower)
      );
    }

    if (showOnlyUngenerated) {
      filtered = filtered.filter(product => !product.barcode);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, products, showOnlyUngenerated]);

  // Individual product search
  useEffect(() => {
    if (!individualSearch) {
      setSearchResults([]);
      return;
    }

    const searchLower = individualSearch.toLowerCase();
    const results = products
      .filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.code?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [individualSearch, products]);

  const generateBarcodeCode = () => {
    return 'BC' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

   const updateProductBarcodeInDB = async (productId, barcode) => {
     try {
       const response = await fetch(`https://apii-iviq.onrender.com/api/products/${productId}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ barcode })
       })
       if (!response.ok) throw new Error('Failed to update product barcode');
       return true;
     } catch (error) {
       console.error('Error updating barcode:', error);
       return false;
     }
   };

  const handleGenerateQRCodes = async (productsToGenerate = selectedProducts) => {
    if (productsToGenerate.length === 0) {
      alert('Please select products first');
      return;
    }

    try {
      const updatedProducts = await Promise.all(productsToGenerate.map(async product => {
        if (product.barcode) {
          const shouldRegenerate = window.confirm(
            `${product.name} already has a barcode (${product.barcode}). Would you like to generate a new one?`
          );
          if (!shouldRegenerate) return product;
        }

        const newBarcode = generateBarcodeCode();
        
         // Update in DB
   const updateSuccess = await updateProductBarcodeInDB(product._id, newBarcode);
   if (!updateSuccess) {
     throw new Error(`Failed to update barcode for ${product.name}`);
   }


        const productData = { ...product, barcode: newBarcode };

        const qrCode = await QRCode.toDataURL(JSON.stringify(productData), {
          type: 'image/png',
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'L',
          scale: 8
        });

        return { ...productData, qrCode };
      }));

      // Update local state
      setProducts(prev => {
        const newProducts = [...prev];
        updatedProducts.forEach(updated => {
          const index = newProducts.findIndex(p => p._id === updated._id);
          if (index !== -1) newProducts[index] = updated;
        });
        return newProducts;
      });

      // Create PDF
      const pdf = new jsPDF();
      const qrSize = 50;
      const margin = 10;
      const labelsPerRow = 3;
      const pageWidth = 210;
      const labelWidth = (pageWidth - (2 * margin)) / labelsPerRow;

      updatedProducts.forEach((product, index) => {
        if (!product.qrCode) return;

        if (index > 0 && index % 9 === 0) {
          pdf.addPage();
        }

        const row = Math.floor((index % 9) / labelsPerRow);
        const col = index % labelsPerRow;
        const x = margin + (col * labelWidth);
        const y = margin + (row * (qrSize + 20));

        pdf.addImage(product.qrCode, 'PNG', x, y, qrSize, qrSize);
        pdf.setFontSize(8);
        pdf.text(product.name, x + (qrSize/2), y + qrSize + 5, { align: 'center' });
        pdf.text(product.code, x + (qrSize/2), y + qrSize + 10, { align: 'center' });
        if (product.barcode) {
          pdf.text(product.barcode, x + (qrSize/2), y + qrSize + 15, { align: 'center' });
        }
      });

      pdf.save('product-barcodes.pdf');

    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Error generating QR codes: ' + error.message);
    }
  };

  const handleGenerateAll = () => {
    const productsWithoutBarcodes = products.filter(p => !p.barcode);
    if (productsWithoutBarcodes.length === 0) {
      alert('All products already have barcodes!');
      return;
    }
    
    const confirm = window.confirm(`Generate barcodes for ${productsWithoutBarcodes.length} products?`);
    if (confirm) {
      handleGenerateQRCodes(productsWithoutBarcodes);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p._id === productId);
      if (isSelected) {
        return prev.filter(p => p._id !== productId);
      } else {
        const product = products.find(p => p._id === productId);
        return [...prev, product];
      }
    });
  };

  if (!isExpanded) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Individual Product Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Quick search for individual product..."
          value={individualSearch}
          onChange={(e) => setIndividualSearch(e.target.value)}
          className="w-full p-2 border rounded-lg pr-10"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            {searchResults.map(product => (
              <div key={product._id} className="p-2 hover:bg-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">{product.code}</div>
                </div>
                {product.barcode ? (
                  <span className="text-green-500 text-sm">
                    {product.barcode}
                  </span>
                ) : (
                  <button
                    onClick={() => handleGenerateQRCodes([product])}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Generate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => handleGenerateQRCodes(selectedProducts)}
          disabled={selectedProducts.length === 0}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Generate Selected ({selectedProducts.length})
        </button>
        <button
          onClick={handleGenerateAll}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Generate All Missing
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Filter products list..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded-lg"
        />
        <button
          onClick={() => setShowOnlyUngenerated(!showOnlyUngenerated)}
          className={`px-4 py-2 rounded-lg ${
            showOnlyUngenerated 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          Show Ungenerated
        </button>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === filteredProducts.length}
                  onChange={(e) => {
                    setSelectedProducts(e.target.checked ? filteredProducts : []);
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedProducts.some(p => p._id === product._id)}
                    onChange={() => toggleProductSelection(product._id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-2">{product.name}</td>
                <td className="px-4 py-2">{product.code}</td>
                <td className="px-4 py-2">
                  {product.barcode ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Generated! ({product.barcode})
                    </span>
                  ) : (
                    <button
                      onClick={() => handleGenerateQRCodes([product])}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Generate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BarcodeManager;