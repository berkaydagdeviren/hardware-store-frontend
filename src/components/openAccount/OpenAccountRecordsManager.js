import React, { useState, useEffect } from 'react';
import { Calendar, Download, Edit, Trash2, X, Save, Building2, Search, Plus, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

const OpenAccountRecordsManager = ({ isExpanded }) => {
  // States
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Effects
  useEffect(() => {
    if (isExpanded) {
      fetchCompanies();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!searchProduct?.trim()) {
      setFilteredProducts([]);
      return;
    }

    const searchLower = searchProduct.toLowerCase();
    const filtered = products.filter(product => 
      product.name.includes(searchLower) ||
      product.code.includes(searchLower)
    ).slice(0, 10);
    setFilteredProducts(filtered);
  }, [searchProduct, products]);

  useEffect(() => {
    if (editingRecord) {
      fetchProducts();
    }
  }, [editingRecord]);

  // Fetch functions
  const fetchCompanies = async () => {
    try {
      const response = await fetch('https://apii-iviq.onrender.com/api/companies');
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c._id === companyId);
    return company ? company.name : 'Unknown Company';
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://apii-iviq.onrender.com/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchRecords = async () => {
    if (!selectedCompany && !startDate && !endDate) {
      alert('Please select a company or date range');
      return;
    }

    setLoading(true);
    try {
      let url = 'https://apii-iviq.onrender.com/api/open-account-records';
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedCompany) params.append('company', selectedCompany);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      const validDatesData = await data.filter(records => {
        return records.date.slice(0, 10) >= startDate && records.date.slice(0, 10) <= endDate
      })
      setRecords(validDatesData);
    } catch (error) {
      console.error('Error fetching records:', error);
      alert('Error fetching records');
    } finally {
      setLoading(false);
    }
  };
  // Edit functions
  const addProduct = (product) => {
    setEditingRecord(prev => ({
      ...prev,
      products: [...prev.products, {
        ...product,
        quantity: 1,
        usePrice2: false,
        price: product.price
      }]
    }));
    setSearchProduct('');
    setFilteredProducts([]);
  };

  const removeProduct = (index) => {
    setEditingRecord(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const updateProductQuantity = (index, change) => {
    setEditingRecord(prev => {
      const newProducts = [...prev.products];
      newProducts[index] = {
        ...newProducts[index],
        quantity: Math.max(1, newProducts[index].quantity + change)
      };
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const togglePriceType = (index) => {
    setEditingRecord(prev => {
      const newProducts = [...prev.products];
      const product = newProducts[index];
      newProducts[index] = {
        ...product,
        usePrice2: !product.usePrice2,
        price: !product.usePrice2 ? product.price2 : product.price
      };
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/open-account-records/${editingRecord._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingRecord)
        }
      );
      const data = await response.json()
      console.log(data)
      if (!response.ok) throw new Error('Failed to update record');
      
      setRecords(prev => prev.map(record => 
        record._id === editingRecord._id ? editingRecord : record
      ));
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/open-account-records/${recordId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete record');
      setRecords(prev => prev.filter(record => record._id !== recordId));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record');
    }
  };

  // Export functions
  const downloadCompanyRecords = async () => {
    if (!selectedCompany) {
      alert('Please select a company first');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/open-account-records`
      );
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      const validDatesData = await data.filter(records => {
        return records.date.slice(0, 10) >= startDate && records.date.slice(0, 10) <= endDate
      })
      if (validDatesData.length === 0) {
        alert('No records found for today');
        return;
      }

      exportToExcel(validDatesData, true);
    } catch (error) {
      console.error('Error fetching records:', error);
      alert('Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllCompaniesToday = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/open-account-records`
      );
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      const validDatesData = await data.filter(records => {
        return records.date.slice(0, 10) >= startDate && records.date.slice(0, 10) <= endDate
      })
      if (validDatesData.length === 0) {
        alert('No records found for today');
        return;
      }

      // Group records by company
      const recordsByCompany = validDatesData.reduce((acc, record) => {
        const companyId = record.company._id;
        if (!acc[companyId]) acc[companyId] = [];
        acc[companyId].push(record);
        return acc;
      }, {});

      // Export each company's records separately
      Object.entries(recordsByCompany).forEach(([companyId, companyRecords]) => {
        exportToExcel(companyRecords, true);
      });
    } catch (error) {
      console.error('Error fetching today\'s records:', error);
      alert('Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (recordsToExport, isSingleCompany = false) => {
    if (recordsToExport.length === 0) {
      alert('No records to export');
      return;
    }

    const formattedRecords = recordsToExport.flatMap(record =>
      record.products.map(product => ({
        'Kod(*)': product.code,
        'Miktar': product.quantity,
        'Mal Fazlası İsk.': '',
        'Fiyat(*)': product.price || 1,
        'İsk.1 Tip': '',
        'İsk.1': '',
        'İsk.2 Tip': '',
        'İsk.2': '',
        'KDV': product.tax || '',
        'Fiili Tarih': new Date(record.date).toLocaleDateString('tr-TR'),
        'Fiyat Tipi': product.priceType === 'price2' ? '2' : '1'
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedRecords);

    ws['!cols'] = [
      { wch: 15 }, // Kod
      { wch: 10 }, // Miktar
      { wch: 15 }, // Mal Fazlası
      { wch: 12 }, // Fiyat
      { wch: 10 }, // İsk.1 Tip
      { wch: 10 }, // İsk.1
      { wch: 10 }, // İsk.2 Tip
      { wch: 10 }, // İsk.2
      { wch: 8 },  // KDV
      { wch: 12 }, // Fiili Tarih
      { wch: 10 }  // Fiyat Tipi
    ];

    const company = recordsToExport[0].company;
    const filename = isSingleCompany
      ? `${company.name}_${new Date().toLocaleDateString('tr-TR')}.xlsx`
      : `open_account_records_${startDate}_to_${endDate}.xlsx`;

    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, filename);
  };
  if (!isExpanded) return null;

  return (
    <div className="space-y-4">
      {/* Company Search and Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Company Search */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">Firma</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Firma Ara..."
              value={companySearchTerm}
              onChange={(e) => {
                setCompanySearchTerm(e.target.value);
                setShowCompanyDropdown(true);
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              className="w-full p-2 border rounded-lg pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            
            {showCompanyDropdown && companySearchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {companies
                  .filter(company => 
                    company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(company => (
                    <button
                      key={company._id}
                      onClick={() => {
                        setSelectedCompany(company._id);
                        setCompanySearchTerm(company.name);
                        setShowCompanyDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {company.name}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={downloadCompanyRecords}
            disabled={!selectedCompany || loading}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600
              disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Bugünün Kayıtlarını İndir
          </button>
          <button
            onClick={downloadAllCompaniesToday}
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600
              disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Building2 className="w-5 h-5" />
            Bugün İçin Tüm Firmaların Kayıtlarını İndir
          </button>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Kayıt Ara</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 
                disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Kayıtları Görüntüle
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Records Table */}
      {!loading && records.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Products</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record._id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(record.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-2">{getCompanyName(record.company)}</td>
                  {console.log(record)}
                  <td className="px-4 py-2">
                    {record.products.length} items
                  </td>
                  <td className="px-4 py-2">
                    {record.products.reduce((sum, p) => sum + (p.price * p.quantity), 0)} TL
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => setEditingRecord(record)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Records Message */}
      {!loading && records.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Seçilen kriterler için kayıt bulunamadı
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Edit Record - {getCompanyName(editingRecord.company)}
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Search and Add */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products to add..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product._id}
                        onClick={() => addProduct(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.code}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {product.price} TL
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Products List */}
              <div className="space-y-2">
                {editingRecord.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">Code: {product.code}</div>
                      </div>
                      <button
                        onClick={() => removeProduct(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateProductQuantity(index, -1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(index, 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => togglePriceType(index)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            !product.usePrice2 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Price 1: {product.price} TL
                        </button>
                        <button
                          onClick={() => togglePriceType(index)}
                          disabled={!product.price2}
                          className={`px-3 py-1 rounded-full text-sm ${
                            product.usePrice2 && product.price2
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          } ${!product.price2 && 'opacity-50 cursor-not-allowed'}`}
                        >
                          Price 2: {(product.price2 || 0)} TL
                        </button>
                      </div>
                      
                      <span className="font-semibold">
                        {(product.price * product.quantity)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total and Actions */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold">
                    {editingRecord.products.reduce((sum, p) => 
                      sum + (p.price * p.quantity), 0
                    )} TL
                  </span>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                      flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenAccountRecordsManager;