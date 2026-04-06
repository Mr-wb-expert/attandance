const STORAGE_KEYS = {
    STUDENTS: 'attendance_students',
    SUBJECTS: 'attendance_subjects',
    ATTENDANCE: 'attendance_records',
    ACTIVITY: 'attendance_activity'
};

let students = [];
let subjects = [];
let attendanceRecords = [];
let activities = [];

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadData() {
    students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];
    subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS)) || [];
    attendanceRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [];
    activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)) || [];
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
}

function addActivity(type, message) {
    activities.unshift({
        type,
        message,
        timestamp: new Date().toISOString()
    });
    if (activities.length > 20) activities = activities.slice(0, 20);
    saveData();
    renderActivities();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetView = document.getElementById(`${view}-view`);
    const targetNav = document.querySelector(`.nav-item[data-view="${view}"]`);
    
    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    window.location.hash = view;
    
    switch(view) {
        case 'dashboard': renderDashboard(); break;
        case 'students': renderStudents(); break;
        case 'subjects': renderSubjects(); break;
        case 'attendance': initAttendanceView(); break;
        case 'history': initHistoryView(); break;
        case 'export': initExportView(); break;
    }
}

function initRouter() {
    window.addEventListener('hashchange', () => {
        const view = window.location.hash.slice(1) || 'dashboard';
        navigate(view);
    });
    
    const initialView = window.location.hash.slice(1) || 'dashboard';
    navigate(initialView);
}

function renderDashboard() {
    document.getElementById('total-students').textContent = students.length;
    document.getElementById('total-subjects').textContent = subjects.length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    document.getElementById('today-attendance').textContent = todayRecords.length > 0 ? 'Done' : 'Pending';
    
    renderActivities();
}

function renderActivities() {
    const container = document.getElementById('activity-list');
    if (!container) return;
    if (activities.length === 0) {
        container.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.slice(0, 10).map(activity => {
        const date = new Date(activity.timestamp);
        const timeAgo = getTimeAgo(date);
        const icon = activity.type === 'attendance' ? 'clipboard-check' : 
                     activity.type === 'student' ? 'user-plus' : 'book';
        return `
            <div class="activity-item ${activity.type}">
                <i class="fas fa-${icon}"></i>
                <span>${activity.message}</span>
                <span class="activity-time">${timeAgo}</span>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function renderStudents() {
    const tbody = document.getElementById('students-table-body');
    const emptyState = document.getElementById('students-empty');
    const tableContainer = document.querySelector('#students-view .table-container');
    
    if (students.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    const sortedStudentsView = [...students].sort((a, b) => {
        const numA = parseInt(a.rollNo) || 0;
        const numB = parseInt(b.rollNo) || 0;
        return numA - numB;
    });
    tbody.innerHTML = sortedStudentsView.map(student => `
        <tr>
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editStudent('${student.id}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteStudent('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showAddStudentModal(student = null) {
    const isEdit = student !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Student' : 'Add Student';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Roll Number</label>
            <input type="text" id="student-rollno" value="${isEdit ? student.rollNo : ''}" placeholder="e.g., 001">
        </div>
        <div class="form-group">
            <label>Student Name</label>
            <input type="text" id="student-name" value="${isEdit ? student.name : ''}" placeholder="Enter student name">
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveStudent${isEdit ? `('${student.id}')` : '()'}">
            ${isEdit ? 'Update' : 'Add'} Student
        </button>
    `;
    openModal();
}

function showBulkAddModal() {
    document.getElementById('modal-title').textContent = 'Bulk Add Students';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Paste Student List</label>
            <textarea id="bulk-students" placeholder="Paste student names here, one per line:&#10;&#10;Muhammad Ali&#10;Ahmed Khan&#10;Sara Fatima&#10;..."></textarea>
            <p class="form-hint">Each line will be treated as a new student. Roll numbers will be auto-generated.</p>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveBulkStudents()">Add All Students</button>
    `;
    openModal();
}

function saveStudent(editId = null) {
    const rollNo = document.getElementById('student-rollno').value.trim();
    const name = document.getElementById('student-name').value.trim();
    
    if (!rollNo || !name) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (editId) {
        const index = students.findIndex(s => s.id === editId);
        if (index !== -1) {
            students[index] = { ...students[index], rollNo, name };
            showToast('Student updated successfully');
            addActivity('student', `Updated student: ${name}`);
        }
    } else {
        students.push({ id: generateId(), rollNo, name });
        showToast('Student added successfully');
        addActivity('student', `Added student: ${name}`);
    }
    
    saveData();
    closeModal();
    renderStudents();
    renderDashboard();
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (student) showAddStudentModal(student);
}

function deleteStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete "${student.name}"?`)) {
        students = students.filter(s => s.id !== id);
        saveData();
        showToast('Student deleted');
        addActivity('student', `Deleted student: ${student.name}`);
        renderStudents();
        renderDashboard();
    }
}

function saveBulkStudents() {
    const bulkData = document.getElementById('bulk-students').value.trim();
    if (!bulkData) {
        showToast('Please enter student names', 'error');
        return;
    }
    
    const names = bulkData.split('\n').map(n => n.trim()).filter(n => n);
    if (names.length === 0) {
        showToast('No valid names found', 'error');
        return;
    }
    
    const startRoll = students.length + 1;
    const newStudents = names.map((name, i) => ({
        id: generateId(),
        rollNo: String(startRoll + i).padStart(3, '0'),
        name
    }));
    
    students.push(...newStudents);
    saveData();
    closeModal();
    showToast(`${newStudents.length} students added successfully`);
    addActivity('student', `Bulk added ${newStudents.length} students`);
    renderStudents();
    renderDashboard();
}

function renderSubjects() {
    const container = document.getElementById('subjects-list');
    const emptyState = document.getElementById('subjects-empty');
    
    if (subjects.length === 0) {
        emptyState.style.display = 'block';
        container.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = subjects.map(subject => `
        <div class="subject-card">
            <div class="subject-info">
                <div class="subject-icon">
                    <i class="fas fa-book"></i>
                </div>
                <div>
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-count">${getAttendanceCount(subject.id)} records</div>
                </div>
            </div>
            <div class="action-btns">
                <button class="action-btn edit" onclick="editSubject('${subject.id}')">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="deleteSubject('${subject.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getAttendanceCount(subjectId) {
    return attendanceRecords.filter(r => r.subjectId === subjectId).length;
}

function showAddSubjectModal(subject = null) {
    const isEdit = subject !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Subject' : 'Add Subject';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Subject Name</label>
            <input type="text" id="subject-name" value="${isEdit ? subject.name : ''}" placeholder="e.g., Mathematics">
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSubject${isEdit ? `('${subject.id}')` : '()'}">
            ${isEdit ? 'Update' : 'Add'} Subject
        </button>
    `;
    openModal();
}

function saveSubject(editId = null) {
    const name = document.getElementById('subject-name').value.trim();
    
    if (!name) {
        showToast('Please enter a subject name', 'error');
        return;
    }
    
    if (editId) {
        const index = subjects.findIndex(s => s.id === editId);
        if (index !== -1) {
            subjects[index] = { ...subjects[index], name };
            showToast('Subject updated successfully');
            addActivity('subject', `Updated subject: ${name}`);
        }
    } else {
        subjects.push({ id: generateId(), name });
        showToast('Subject added successfully');
        addActivity('subject', `Added subject: ${name}`);
    }
    
    saveData();
    closeModal();
    renderSubjects();
    renderDashboard();
    updateSubjectDropdowns();
}

function editSubject(id) {
    const subject = subjects.find(s => s.id === id);
    if (subject) showAddSubjectModal(subject);
}

function deleteSubject(id) {
    const subject = subjects.find(s => s.id === id);
    if (!subject) return;
    
    if (confirm(`Are you sure you want to delete "${subject.name}"? All attendance records for this subject will also be deleted.`)) {
        subjects = subjects.filter(s => s.id !== id);
        attendanceRecords = attendanceRecords.filter(r => r.subjectId !== id);
        saveData();
        showToast('Subject deleted');
        addActivity('subject', `Deleted subject: ${subject.name}`);
        renderSubjects();
        renderDashboard();
    }
}

function updateSubjectDropdowns() {
    const dropdowns = ['attendance-subject', 'history-subject', 'export-subject'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const currentValue = select.value;
        const isExportAll = id === 'export-subject';
        
        select.innerHTML = isExportAll ? '<option value="all">All Subjects</option>' : '<option value="">Select Subject</option>';
        
        subjects.forEach(subject => {
            select.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
        });
        
        if (currentValue) select.value = currentValue;
    });
}

function initAttendanceView() {
    updateSubjectDropdowns();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    loadAttendanceForDate();
}

function goToToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    loadAttendanceForDate();
}

let currentAttendanceData = {};

function loadAttendanceForDate() {
    const subjectId = document.getElementById('attendance-subject').value;
    const date = document.getElementById('attendance-date').value;
    const container = document.getElementById('attendance-list');
    const emptyState = document.getElementById('attendance-empty');
    const saveBtn = document.getElementById('save-attendance');
    const markAllBtn = document.getElementById('mark-all-present');
    
    if (!subjectId || !date) {
        emptyState.style.display = 'block';
        container.innerHTML = '';
        saveBtn.style.display = 'none';
        markAllBtn.disabled = true;
        return;
    }
    
    markAllBtn.disabled = false;
    
    const existingRecord = attendanceRecords.find(r => r.date === date && r.subjectId === subjectId);
    
    if (existingRecord) {
        currentAttendanceData = {};
        existingRecord.records.forEach(rec => {
            currentAttendanceData[rec.studentId] = rec.status;
        });
    } else {
        currentAttendanceData = {};
    }
    
    if (students.length === 0) {
        emptyState.querySelector('h3').textContent = 'No Students';
        emptyState.querySelector('p').textContent = 'Add students first to mark attendance';
        emptyState.style.display = 'block';
        container.innerHTML = '';
        saveBtn.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    saveBtn.style.display = 'block';
    
    const sortedAttendanceStudents = [...students].sort((a, b) => {
        const numA = parseInt(a.rollNo) || 0;
        const numB = parseInt(b.rollNo) || 0;
        return numA - numB;
    });
    container.innerHTML = sortedAttendanceStudents.map(student => `
        <div class="attendance-item">
            <div class="student-info">
                <div class="roll-no">${student.rollNo}</div>
                <div class="student-name">${student.name}</div>
            </div>
            <div class="status-toggle" data-student-id="${student.id}">
                <button class="status-btn present ${currentAttendanceData[student.id] === 'P' ? 'active' : ''}" 
                        onclick="setStatus('${student.id}', 'P')">P</button>
                <button class="status-btn absent ${currentAttendanceData[student.id] === 'A' ? 'active' : ''}" 
                        onclick="setStatus('${student.id}', 'A')">A</button>
                <button class="status-btn leave ${currentAttendanceData[student.id] === 'L' ? 'active' : ''}" 
                        onclick="setStatus('${student.id}', 'L')">L</button>
            </div>
        </div>
    `).join('');
}

function setStatus(studentId, status) {
    currentAttendanceData[studentId] = status;
    const toggle = document.querySelector(`.status-toggle[data-student-id="${studentId}"]`);
    if (toggle) {
        toggle.querySelectorAll('.status-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === status) btn.classList.add('active');
        });
    }
}

function markAllPresent() {
    students.forEach(student => {
        currentAttendanceData[student.id] = 'P';
    });
    document.querySelectorAll('.status-toggle').forEach(toggle => {
        toggle.querySelectorAll('.status-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.classList.contains('present')) btn.classList.add('active');
        });
    });
}

function confirmSaveAttendance() {
    const subjectId = document.getElementById('attendance-subject').value;
    const date = document.getElementById('attendance-date').value;
    
    if (!subjectId || !date) {
        showToast('Please select subject and date', 'error');
        return;
    }
    
    const allMarked = students.every(s => currentAttendanceData[s.id]);
    if (!allMarked) {
        showToast('Please mark attendance for all students', 'error');
        return;
    }
    
    const subject = subjects.find(s => s.id === subjectId);
    const studentCount = students.length;
    const presentCount = Object.values(currentAttendanceData).filter(s => s === 'P').length;
    const absentCount = Object.values(currentAttendanceData).filter(s => s === 'A').length;
    const leaveCount = Object.values(currentAttendanceData).filter(s => s === 'L').length;
    
    document.getElementById('modal-title').textContent = 'Confirm Submission';
    document.getElementById('modal-body').innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon">
                <i class="fas fa-clipboard-check"></i>
            </div>
            <h3>Submit Attendance?</h3>
            <p class="confirm-details">
                <strong>Subject:</strong> ${subject ? subject.name : 'N/A'}<br>
                <strong>Date:</strong> ${formatDate(date)}<br>
                <strong>Total Students:</strong> ${studentCount}<br>
                <strong>Present:</strong> ${presentCount} | 
                <strong>Absent:</strong> ${absentCount} | 
                <strong>Leave:</strong> ${leaveCount}
            </p>
            <p class="confirm-warning">This action cannot be undone. Are you sure you want to submit?</p>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveAttendance()">
            <i class="fas fa-check"></i> Confirm & Submit
        </button>
    `;
    openModal();
}

function saveAttendance() {
    const subjectId = document.getElementById('attendance-subject').value;
    const date = document.getElementById('attendance-date').value;
    
    closeModal();
    
    const records = students.map(student => ({
        studentId: student.id,
        rollNo: student.rollNo,
        studentName: student.name,
        status: currentAttendanceData[student.id] || 'A'
    }));
    
    const existingIndex = attendanceRecords.findIndex(r => r.date === date && r.subjectId === subjectId);
    
    if (existingIndex !== -1) {
        attendanceRecords[existingIndex].records = records;
    } else {
        attendanceRecords.push({ date, subjectId, records });
    }
    
    saveData();
    showToast('Attendance submitted successfully');
    
    const subject = subjects.find(s => s.id === subjectId);
    addActivity('attendance', `Marked attendance for ${subject ? subject.name : 'subject'} on ${formatDate(date)}`);
    renderDashboard();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initHistoryView() {
    updateSubjectDropdowns();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    document.getElementById('history-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('history-to').value = today.toISOString().split('T')[0];
    
    loadHistory();
}

function loadHistory() {
    const subjectId = document.getElementById('history-subject').value;
    const fromDate = document.getElementById('history-from').value;
    const toDate = document.getElementById('history-to').value;
    
    let filtered = attendanceRecords;
    
    if (subjectId) {
        filtered = filtered.filter(r => r.subjectId === subjectId);
    }
    
    if (fromDate) {
        filtered = filtered.filter(r => r.date >= fromDate);
    }
    
    if (toDate) {
        filtered = filtered.filter(r => r.date <= toDate);
    }
    
    const tableContainer = document.getElementById('history-table-container');
    const emptyState = document.getElementById('history-empty');
    
    if (filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    const sortedRecords = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const dates = [...new Set(sortedRecords.map(r => r.date))].sort();
    
    const thead = document.getElementById('history-table-head');
    thead.innerHTML = `
        <tr>
            <th>Roll No</th>
            <th>Name</th>
            ${dates.map(d => `<th>${formatShortDate(d)}</th>`).join('')}
        </tr>
    `;
    
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = students.map(student => {
        const studentRecords = {};
        sortedRecords.forEach(record => {
            const found = record.records.find(r => r.studentId === student.id);
            if (found) studentRecords[record.date] = found.status;
        });
        
        return `
            <tr>
                <td>${student.rollNo}</td>
                <td>${student.name}</td>
                ${dates.map(d => {
                    const status = studentRecords[d];
                    return `<td><span class="status-cell ${status || '-'}">${status || '-'}</span></td>`;
                }).join('')}
            </tr>
        `;
    }).join('');
}

function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initExportView() {
    updateSubjectDropdowns();
    loadData();
    
    const statusContainer = document.getElementById('export-data-status');
    
    if (students.length === 0 && attendanceRecords.length === 0) {
        statusContainer.innerHTML = '<p class="data-status-empty">No data available. Add students and mark attendance first.</p>';
    } else {
        statusContainer.innerHTML = `
            <div class="data-status-item students">
                <i class="fas fa-users"></i>
                <span><strong>${students.length}</strong> Students</span>
            </div>
            <div class="data-status-item subjects">
                <i class="fas fa-book"></i>
                <span><strong>${subjects.length}</strong> Subjects</span>
            </div>
            <div class="data-status-item records">
                <i class="fas fa-clipboard-check"></i>
                <span><strong>${attendanceRecords.length}</strong> Attendance Records</span>
            </div>
        `;
    }
    
    const today = new Date();
    const year = today.getFullYear();
    const month = 3;
    const daysInMonth = getDaysInMonth(year, month);
    const startDate = `${year}-04-01`;
    const endDate = `${year}-04-${String(daysInMonth).padStart(2, '0')}`;
    
    document.getElementById('export-from').value = startDate;
    document.getElementById('export-to').value = endDate;
}

function repairAttendanceData() {
    loadData();
    
    let fixed = 0;
    
    attendanceRecords.forEach(record => {
        record.records.forEach(rec => {
            const student = students.find(s => s.id === rec.studentId);
            if (!student) {
                const matchedStudent = students.find(s => s.rollNo === rec.rollNo);
                if (matchedStudent) {
                    rec.studentId = matchedStudent.id;
                    fixed++;
                }
            }
        });
    });
    
    if (fixed > 0) {
        saveData();
        showToast(`Fixed ${fixed} records`);
    } else {
        showToast('No data issues found');
    }
    
    initExportView();
}

function clearAllData() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
        if (confirm('This will delete all students, subjects, and attendance records. Continue?')) {
            localStorage.removeItem(STORAGE_KEYS.STUDENTS);
            localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
            localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
            localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
            students = [];
            subjects = [];
            attendanceRecords = [];
            activities = [];
            showToast('All data cleared');
            initExportView();
        }
    }
}

function clearActivityLog() {
    activities = [];
    saveData();
    renderActivities();
    showToast('Activity log cleared');
}

function resetAllData() {
    document.getElementById('modal-title').textContent = 'Reset Database';
    document.getElementById('modal-body').innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Reset All Data?</h3>
            <p class="confirm-details">
                This will permanently delete:<br><br>
                <strong>${students.length}</strong> Students<br>
                <strong>${subjects.length}</strong> Subjects<br>
                <strong>${attendanceRecords.length}</strong> Attendance Records<br>
                <strong>${activities.length}</strong> Activity Logs
            </p>
            <p class="confirm-warning">This action cannot be undone!</p>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="doResetData()">
            <i class="fas fa-trash"></i> Reset Everything
        </button>
    `;
    openModal();
}

function doResetData() {
    closeModal();
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
    students = [];
    subjects = [];
    attendanceRecords = [];
    activities = [];
    showToast('All data has been reset');
    renderDashboard();
    renderStudents();
    renderSubjects();
    updateSubjectDropdowns();
}

function rebuildAttendanceData() {
    document.getElementById('modal-title').textContent = 'Rebuild Data';
    document.getElementById('modal-body').innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <i class="fas fa-sync"></i>
            </div>
            <h3>Rebuild Attendance Data?</h3>
            <p class="confirm-details">
                This will try to match attendance records with students using roll numbers.<br><br>
                <strong>Students:</strong> ${students.length}<br>
                <strong>Attendance Records:</strong> ${attendanceRecords.length}
            </p>
            <p class="confirm-warning">Use this if exported Excel shows empty data.</p>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="doRebuildData()">
            <i class="fas fa-sync"></i> Rebuild
        </button>
    `;
    openModal();
}

function doRebuildData() {
    closeModal();
    
    if (students.length === 0) {
        showToast('No students to rebuild data for', 'error');
        return;
    }
    
    const newRecords = [];
    
    attendanceRecords.forEach(record => {
        const newRec = {
            date: record.date,
            subjectId: record.subjectId,
            records: []
        };
        
        record.records.forEach(rec => {
            let matchedStudent = students.find(s => s.id === rec.studentId);
            
            if (!matchedStudent && rec.rollNo) {
                matchedStudent = students.find(s => s.rollNo === rec.rollNo);
            }
            
            if (!matchedStudent && rec.studentName) {
                matchedStudent = students.find(s => s.name === rec.studentName);
            }
            
            if (matchedStudent) {
                newRec.records.push({
                    studentId: matchedStudent.id,
                    rollNo: matchedStudent.rollNo,
                    studentName: matchedStudent.name,
                    status: rec.status
                });
            }
        });
        
        if (newRec.records.length > 0) {
            newRecords.push(newRec);
        }
    });
    
    attendanceRecords = newRecords;
    saveData();
    
    showToast(`Rebuilt ${attendanceRecords.length} records`);
    initExportView();
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function exportToExcel() {
    const subjectId = document.getElementById('export-subject').value;
    const fromDate = document.getElementById('export-from').value;
    const toDate = document.getElementById('export-to').value;
    
    document.getElementById('modal-title').textContent = 'Prepare Export';
    document.getElementById('modal-body').innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
                <i class="fas fa-file-excel"></i>
            </div>
            <h3>Prepare & Download Excel</h3>
            <p class="confirm-details">
                This will rebuild data and export attendance to Excel.<br><br>
                <strong>Students:</strong> ${students.length}<br>
                <strong>Attendance Records:</strong> ${attendanceRecords.length}
            </p>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="doExportWithRebuild('${subjectId}', '${fromDate}', '${toDate}')">
            <i class="fas fa-download"></i> Download
        </button>
    `;
    openModal();
}

function doExportWithRebuild(subjectId, fromDate, toDate) {
    closeModal();
    
    loadData();
    
    if (students.length === 0) {
        showToast('No students found', 'error');
        return;
    }
    
    if (attendanceRecords.length === 0) {
        showToast('No attendance records found', 'error');
        return;
    }
    
    doRebuildDataSilent();
    
    let filteredRecords = [...attendanceRecords];
    
    if (subjectId !== 'all') {
        filteredRecords = filteredRecords.filter(r => r.subjectId === subjectId);
    }
    
    if (filteredRecords.length === 0) {
        showToast('No records for selected subject', 'error');
        return;
    }
    
    const startDate = fromDate || '2026-04-01';
    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const workbook = XLSX.utils.book_new();
    
    const subjectsToExport = subjectId !== 'all' 
        ? subjects.filter(s => s.id === subjectId)
        : subjects;
    
    subjectsToExport.forEach(subject => {
        const subjectRecords = filteredRecords.filter(r => r.subjectId === subject.id);
        
        if (subjectRecords.length === 0) return;
        
        const markedDatesSet = new Set(subjectRecords.map(r => r.date));
        
        const allDaysInfo = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(dateStr);
            allDaysInfo.push({
                dateStr: dateStr,
                day: day,
                dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2),
                isSunday: dateObj.getDay() === 0,
                isMarked: markedDatesSet.has(dateStr)
            });
        }
        
        const markedCount = markedDatesSet.size;
        
        const data = [];
        data.push([`Govt. Graduate College Burewala`]);
        data.push([`Attendance Report for the month of ${monthName}`]);
        data.push([`BSCS Semester - 6(2023-2027)`]);
        data.push([`Month: ${monthName}`]);
        data.push([`Total Classes: ${markedCount}`]);
        data.push([]);
        
        const headerRow1 = ['S.No', 'Roll No', 'Name'];
        const headerRow2 = ['', '', ''];
        
        allDaysInfo.forEach(md => {
            const label = `${new Date(md.dateStr).toLocaleDateString('en-US', { month: 'short' })} ${md.day}`;
            headerRow1.push(label);
            headerRow2.push(md.dayName);
        });
        
        headerRow1.push('P', 'A', 'L', 'Total', '%');
        headerRow2.push('', '', '', '', '');
        
        data.push(headerRow1);
        data.push(headerRow2);
        
        const sortedStudents = [...students].sort((a, b) => {
            const numA = parseInt(a.rollNo) || 0;
            const numB = parseInt(b.rollNo) || 0;
            return numA - numB;
        });
        
        sortedStudents.forEach((student, idx) => {
            const row = [idx + 1, student.rollNo, student.name];
            let present = 0, absent = 0, leave = 0, total = 0;
            
            allDaysInfo.forEach(md => {
                let status = '';
                
                if (md.isMarked) {
                    const recordForDate = subjectRecords.find(r => r.date === md.dateStr);
                    if (recordForDate && recordForDate.records) {
                        const studentRecord = recordForDate.records.find(r => 
                            r.studentId === student.id || r.rollNo === student.rollNo
                        );
                        if (studentRecord) {
                            status = studentRecord.status;
                        }
                    }
                }
                
                row.push(status);
                
                if (status === 'P') { present++; total++; }
                else if (status === 'A') { absent++; total++; }
                else if (status === 'L') { leave++; total++; }
            });
            
            const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
            row.push(present, absent, leave, total, percentage + '%');
            data.push(row);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        const numCols = 3 + allDaysInfo.length + 5;
        ws['!cols'] = [
            { wch: 5 },
            { wch: 10 },
            { wch: 22 },
            ...allDaysInfo.map(() => ({ wch: 7 })),
            { wch: 4 },
            { wch: 4 },
            { wch: 4 },
            { wch: 6 },
            { wch: 6 }
        ];
        
        for (let R = 0; R < data.length; R++) {
            for (let C = 0; C < data[R].length; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (cell) {
                    const isStudentRow = R >= 7 && R < 7 + sortedStudents.length;
                    const isDataCol = C >= 3 && C < 3 + daysInMonth;
                    const dayIndex = isDataCol ? C - 3 : -1;
                    const dayInfo = dayIndex >= 0 ? allDaysInfo[dayIndex] : null;
                    const isSunday = dayInfo ? dayInfo.isSunday : false;
                    
                    let fillColor = 'FFFFFF';
                    let fontColor = '000000';
                    let bold = false;
                    
                    if (R === 0 || R === 1 || R === 2) {
                        fillColor = '4472C4';
                        fontColor = 'FFFFFF';
                        bold = true;
                    } else if (R === 3) {
                        fillColor = 'E8E8E8';
                        fontColor = '000000';
                        bold = true;
                    } else if (R === 5 && isDataCol) {
                        fillColor = isSunday ? 'FF6666' : 'D9E2F3';
                        fontColor = isSunday ? 'FFFFFF' : '000000';
                        bold = true;
                    } else if (R === 6 && isDataCol) {
                        fillColor = isSunday ? 'FF9999' : 'E8E8E8';
                        fontColor = isSunday ? 'FFFFFF' : '000000';
                        bold = true;
                    } else if (isStudentRow && isDataCol) {
                        const status = data[R][C];
                        if (isSunday) {
                            fillColor = 'FFDDDD';
                        } else if (status === 'P') {
                            fillColor = 'C6EFCE';
                            fontColor = '006100';
                            bold = true;
                        } else if (status === 'A') {
                            fillColor = 'FFC7CE';
                            fontColor = '9C0006';
                            bold = true;
                        } else if (status === 'L') {
                            fillColor = 'FFEB9C';
                            fontColor = '9C5700';
                            bold = true;
                        }
                    }
                    
                    cell.s = {
                        alignment: { horizontal: 'center', vertical: 'center' },
                        font: { name: 'Calibri', sz: 11, bold: bold, color: { rgb: fontColor } },
                        fill: { patternType: 'solid', fgColor: { rgb: fillColor } }
                    };
                }
            }
        }
        
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: numCols - 1 } },
            { s: { r: 4, c: 0 }, e: { r: 4, c: numCols - 1 } }
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, subject.name.substring(0, 28));
    });
    
    if (workbook.SheetNames.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    const filename = subjectId !== 'all'
        ? `Attendance_${subjects.find(s => s.id === subjectId)?.name || 'Export'}.xlsx`
        : `Attendance_All_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    showToast(`Exported ${workbook.SheetNames.length} sheet(s)`);
}

function doRebuildDataSilent() {
    if (students.length === 0) return;
    
    const newRecords = [];
    
    attendanceRecords.forEach(record => {
        const newRec = {
            date: record.date,
            subjectId: record.subjectId,
            records: []
        };
        
        record.records.forEach(rec => {
            let matchedStudent = students.find(s => s.id === rec.studentId);
            
            if (!matchedStudent && rec.rollNo) {
                matchedStudent = students.find(s => s.rollNo === rec.rollNo);
            }
            
            if (!matchedStudent && rec.studentName) {
                matchedStudent = students.find(s => s.name === rec.studentName);
            }
            
            if (matchedStudent) {
                newRec.records.push({
                    studentId: matchedStudent.id,
                    rollNo: matchedStudent.rollNo,
                    studentName: matchedStudent.name,
                    status: rec.status
                });
            }
        });
        
        if (newRec.records.length > 0) {
            newRecords.push(newRec);
        }
    });
    
    attendanceRecords = newRecords;
    saveData();
}

function openModal() {
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

loadData();
initRouter();
