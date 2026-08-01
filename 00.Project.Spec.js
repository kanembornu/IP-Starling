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
 * Code.gs
 * │
 * ▼
 * Router
 * │
 * ▼
 * Service Layer
 * │
 * ▼
 * Framework Layer
 * │
 * ▼
 * Repository Layer
 * │
 * ▼
 * Database Layer
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
 * 00.Project.Spec.gs
 * 10.Config.gs
 * 15.Schema.gs
 * 20.Database.gs
 * 72.Framework.Utils.gs
 * 30.Router.gs
 * 35.Code.gs
 *
 * Repository
 * ----------
 * 40.Repository.Base.gs
 * 45.Repository.Core.gs
 * 50.Repository.Cache.gs
 * 55.Repository.Reader.gs
 * 60.Repository.Writer.gs
 * 66.Repository.Query.gs
 *
 * Framework
 * ----------
 * 70.Framework.Response.gs
 * 75.Framework.Validator.gs
 * 80.Framework.Logger.gs
 * 85.Framework.IDGenerator.gs
 * 90.Framework.BaseService.gs
 *
 * Services
 * --------
 * 100.Service.Product.gs
 * 105.Service.Partner.gs
 * 110.Service.Pickup.gs
 * 115.Service.Return.gs
 * 120.Service.Purchasing.gs
 * 125.Service.Expense.gs
 * 130.Service.Dashboard.gs
 *
 * Views
 * -----
 * 900.View.Index.html
 * 905.View.Dashboard.html
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
