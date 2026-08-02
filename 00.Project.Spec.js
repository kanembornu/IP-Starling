/**
 * =============================================================================
 * PROJECT          : IP-Starling
 * =============================================================================
 *
 * VERSION          : 1.0.0-dev
 * BUILD            : Development
 *
 * PLATFORM         : Google Apps Script
 * DATABASE         : Google Spreadsheet
 *
 * =============================================================================
 * DESCRIPTION
 * =============================================================================
 *
 * IP-Starling adalah sistem manajemen operasional berbasis Google Apps Script
 * yang dikembangkan dengan arsitektur berlapis (Layered Architecture).
 *
 * Seluruh akses data dilakukan melalui Repository Pattern sehingga Service
 * maupun Frontend tidak pernah mengakses Spreadsheet secara langsung.
 *
 * =============================================================================
 * PROJECT LAYER
 * =============================================================================
 *
 * Browser
 * │
 * ▼
 * HTML View
 * │
 * ▼
 * App → Presenter → Shared Presenter / Render / Components
 * │
 * ▼
 * API → Controller → Service → Repository → Database
 * │
 * ▼
 * Google Spreadsheet
 *
 * =============================================================================
 * DIRECTORY (Logical)
 * =============================================================================
 *
 * Foundation
 * ----------
 * 00.Project.Spec.js
 * 10.Config.js
 * 15.Schema.js
 * 20.Database.js
 * 72.Framework.Utils.js
 * 30.Router.js
 * 35.Code.js
 *
 * Repository
 * ----------
 * 40.Repository.Base.js
 * 50.Repository.Cache.js
 * 55.Repository.Reader.js
 * 60.Repository.Writer.js
 * 65.Repository.Idempotency.js
 * 66.Repository.Query.js
 * 67.Repository.Logs.js
 *
 * Framework
 * ----------
 * 70.Framework.Response.js
 * 75.Framework.Validator.js
 * 80.Framework.Logger.js
 * 85.Framework.IDGenerator.js
 * 90.Framework.BaseService.js
 *
 * Services
 * --------
 * 100.Service.Product.js
 * 105.Service.Partner.js
 * 110.Service.Pickup.js
 * 115.Service.Return.js
 * 120.Service.Purchasing.js
 * 125.Service.Expense.js
 * 127.Service.Idempotency.js
 * 128.Service.Settings.js
 * 129.Service.Logs.js
 * 130.Service.Dashboard.js
 * 135.Service.ApplicationHealth.js
 *
 * Views
 * -----
 * 900.View.Index.html
 * 905.View.Layout.html
 * 915.View.Dashboard.html
 *
 * =============================================================================
 * CODING STANDARD
 * =============================================================================
 *
 * 1.
 * Repository adalah SATU-SATUNYA layer yang boleh mengakses SpreadsheetApp.
 *
 * 2.
 * Service tidak boleh memanggil SpreadsheetApp.
 *
 * 3.
 * View tidak boleh memanggil SpreadsheetApp.
 *
 * 4.
 * Semua CRUD harus melalui BaseRepository.
 *
 * 5.
 * Semua response backend menggunakan Framework.Response.
 *
 * 6.
 * Semua validasi menggunakan Framework.Validator.
 *
 * 7.
 * Semua log menggunakan Framework.Logger.
 *
 * 8.
 * Semua ID dibuat oleh Framework.IDGenerator.
 *
 * 9.
 * Delete menggunakan Soft Delete.
 *
 * 10.
 * Tidak boleh menggunakan deleteRow().
 *
 * 11.
 * Semua data yang keluar dari Repository berbentuk Object.
 *
 * 12.
 * Tidak menggunakan array index seperti row[3].
 *
 * 13.
 * Semua update wajib mengisi UpdatedAt dan UpdatedBy.
 *
 * 14.
 * Semua insert wajib mengisi:
 *
 * CreatedAt
 * CreatedBy
 * UpdatedAt
 * UpdatedBy
 * Deleted
 * IsActive
 *
 * =============================================================================
 * OBJECT FLOW
 * =============================================================================
 *
 * Spreadsheet
 *
 * ID | Nama | Harga
 *
 * ▼
 *
 * Repository
 *
 * {
 *      ID:"PR001",
 *      Nama:"Americano",
 *      Harga:15000
 * }
 *
 * =============================================================================
 * VERSION HISTORY
 * =============================================================================
 *
 * 0.1.0
 * - Initial Project
 *
 * =============================================================================
 */
