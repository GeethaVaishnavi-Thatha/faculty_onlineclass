const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    createFaculty, 
    getAllFaculty, 
    getFacultyById, 
    updateFaculty, 
    deleteFaculty, 
    downloadExcel,
    getFacultyStats,
    getAllFacultyFull
} = require('../controllers/facultyController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'passportPhoto') {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /image\/jpeg|image\/jpg|image\/png/.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Passport photo must be JPG or PNG.'));
        }
    } else {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type! Only PDF, JPG, JPEG, and PNG are allowed.'));
        }
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

const cpUpload = upload.fields([
    { name: 'aadhaarFile', maxCount: 1 },
    { name: 'panFile', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 }
]);

router.post('/', cpUpload, createFaculty);
router.get('/', getAllFaculty);
router.get('/stats', getFacultyStats);
router.get('/all', getAllFacultyFull);
router.get('/download/excel', downloadExcel);
router.get('/:id', getFacultyById);
router.put('/:id', cpUpload, updateFaculty);
router.delete('/:id', deleteFaculty);

module.exports = router;