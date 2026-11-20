import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UploadLandingPage from '../upload/UploadLandingPage';
import LibraryPage from '../library/LibraryPage';
import ReaderPage from '../reader/ReaderPage';
import { ErrorBoundary } from '../components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<UploadLandingPage />} />
        <Route path="/upload" element={<UploadLandingPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
