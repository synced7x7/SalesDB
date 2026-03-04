import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Upload, Plus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

// Data Management Page Component

export default function DataManagementPage() {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [tableSchema, setTableSchema] = useState([]);
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'bulk'
    const [formData, setFormData] = useState({});
    const [csvData, setCsvData] = useState([]);
    const [csvPreview, setCsvPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Fetch available tables
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const response = await axios.get('http://localhost:5001/api/data-management/tables');
                setTables(response.data.tables);
            } catch (error) {
                console.error('Error fetching tables:', error);
            }
        };
        fetchTables();
    }, []);

    // Fetch table schema when table is selected
    useEffect(() => {
        if (selectedTable) {
            const fetchSchema = async () => {
                try {
                    const response = await axios.get(`http://localhost:5001/api/data-management/schema/${selectedTable}`);
                    setTableSchema(response.data.columns || []);
                    setFormData({});
                } catch (error) {
                    console.error('Error fetching schema:', error);
                }
            };
            fetchSchema();
        }
    }, [selectedTable]);

    // Handle manual form input
    const handleInputChange = (columnName, value) => {
        setFormData(prev => ({ ...prev, [columnName]: value }));
    };

    // Handle manual insert
    const handleManualInsert = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await axios.post(
                `http://localhost:5001/api/data-management/insert/${selectedTable}`,
                formData
            );
            setMessage({ type: 'success', text: response.data.message });
            setFormData({});
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.details || 'Failed to insert record'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle CSV file drop
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setCsvData(results.data);
                    setCsvPreview(results.data.slice(0, 10)); // Show first 10 rows
                    setMessage({ type: 'info', text: `Loaded ${results.data.length} rows from CSV` });
                },
                error: (error) => {
                    setMessage({ type: 'error', text: 'Failed to parse CSV file' });
                }
            });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false
    });

    // Helper to translate DB errors to user-friendly messages
    const getUserFriendlyError = (error, tableName) => {
        const details = error.response?.data?.details || error.message;

        // Foreign Key Violations
        if (details.includes('violates foreign key constraint')) {
            if (details.includes('category_id')) return `Error: The Category ID used doesn't exist yet. Please import 'Categories' first.`;
            if (details.includes('seller_id')) return `Error: The Seller ID used doesn't exist yet. Please import 'Sellers' first.`;
            if (details.includes('customer_id')) return `Error: The Customer ID used doesn't exist yet. Please import 'Customers' first.`;
            if (details.includes('product_id')) return `Error: The Product ID used doesn't exist yet. Please import 'Products' first.`;
            if (details.includes('order_id')) return `Error: The Order ID used doesn't exist yet. Please import 'Orders' first.`;
            if (details.includes('warehouse_id')) return `Error: The Warehouse ID used doesn't exist yet. Please import 'Warehouses' first.`;
            return `Dependency Error: This data references records in another table that don't exist yet. Check your import order.`;
        }

        // Schema Cache / Column Missing
        if (details.includes('Could not find the') && details.includes('column')) {
            return `Schema Error: The CSV columns don't match the '${tableName}' table. Are you sure you uploaded the right file?`;
        }

        return details || 'Failed to insert records';
    };

    // Handle bulk insert
    const handleBulkInsert = async () => {
        if (csvData.length === 0) {
            setMessage({ type: 'error', text: 'No data to insert' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await axios.post(
                `http://localhost:5001/api/data-management/bulk-insert/${selectedTable}`,
                { records: csvData }
            );
            setMessage({
                type: 'success',
                text: `Successfully inserted ${response.data.insertedCount} records`
            });
            setCsvData([]);
            setCsvPreview([]);
        } catch (error) {
            setMessage({
                type: 'error',
                text: getUserFriendlyError(error, selectedTable)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                    Data Management
                </h1>
                <p style={{ color: '#64748b', fontSize: '16px' }}>
                    Insert single records or bulk import data from CSV files
                </p>
            </div>

            {/* Table Selector */}
            <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                    Select Table
                </label>
                <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <option value="">-- Choose a table --</option>
                    {tables.map(table => (
                        <option key={table.name} value={table.name}>
                            {table.displayName}
                        </option>
                    ))}
                </select>
            </div>

            {selectedTable && (
                <>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
                        <button
                            onClick={() => setActiveTab('manual')}
                            style={{
                                padding: '12px 24px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'manual' ? '2px solid #6366f1' : 'none',
                                color: activeTab === 'manual' ? '#6366f1' : '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '-2px'
                            }}
                        >
                            <Plus size={18} style={{ display: 'inline', marginRight: '8px' }} />
                            Manual Insert
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            style={{
                                padding: '12px 24px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'bulk' ? '2px solid #6366f1' : 'none',
                                color: activeTab === 'bulk' ? '#6366f1' : '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '-2px'
                            }}
                        >
                            <Upload size={18} style={{ display: 'inline', marginRight: '8px' }} />
                            Bulk Import
                        </button>
                    </div>

                    {/* Message Display */}
                    {message && (
                        <div style={{
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            background: message.type === 'success' ? '#f0fdf4' : message.type === 'error' ? '#fef2f2' : '#eff6ff',
                            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : message.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
                            color: message.type === 'success' ? '#166534' : message.type === 'error' ? '#991b1b' : '#1e40af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            {message.text}
                        </div>
                    )}

                    {/* Manual Insert Tab */}
                    {activeTab === 'manual' && (
                        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '700' }}>
                                Insert New Record
                            </h3>
                            <form onSubmit={handleManualInsert}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    {tableSchema.map(column => (
                                        <div key={column.column_name}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#334155' }}>
                                                {column.column_name}
                                                {column.is_nullable === 'NO' && <span style={{ color: '#ef4444' }}>*</span>}
                                            </label>
                                            <input
                                                type={column.data_type === 'integer' || column.data_type === 'numeric' ? 'number' : 'text'}
                                                value={formData[column.column_name] || ''}
                                                onChange={(e) => handleInputChange(column.column_name, e.target.value)}
                                                required={column.is_nullable === 'NO'}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <small style={{ color: '#64748b', fontSize: '12px' }}>
                                                {column.data_type}
                                            </small>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        marginTop: '24px',
                                        padding: '12px 24px',
                                        background: '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.6 : 1
                                    }}
                                >
                                    {loading ? 'Inserting...' : 'Insert Record'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Bulk Import Tab */}
                    {activeTab === 'bulk' && (
                        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '700' }}>
                                Upload CSV File
                            </h3>

                            {/* Dropzone */}
                            <div
                                {...getRootProps()}
                                style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '48px',
                                    textAlign: 'center',
                                    background: isDragActive ? '#f1f5f9' : '#f8fafc',
                                    cursor: 'pointer',
                                    marginBottom: '24px'
                                }}
                            >
                                <input {...getInputProps()} />
                                <FileText size={48} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
                                <p style={{ color: '#475569', fontWeight: '600', marginBottom: '8px' }}>
                                    {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '14px' }}>or click to browse</p>
                            </div>

                            {/* CSV Preview */}
                            {csvPreview.length > 0 && (
                                <div>
                                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                                        Preview ({csvData.length} total rows)
                                    </h4>
                                    <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9' }}>
                                                    {Object.keys(csvPreview[0]).map(key => (
                                                        <th key={key} style={{ padding: '12px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvPreview.map((row, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        {Object.values(row).map((val, i) => (
                                                            <td key={i} style={{ padding: '12px' }}>{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button
                                        onClick={handleBulkInsert}
                                        disabled={loading}
                                        style={{
                                            padding: '12px 24px',
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.6 : 1
                                        }}
                                    >
                                        {loading ? 'Importing...' : `Import ${csvData.length} Records`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
