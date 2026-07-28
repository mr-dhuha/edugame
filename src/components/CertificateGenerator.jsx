import React, { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as LucideIcons from 'lucide-react';
import { fsm, STATES } from '../core/FSMEngine';

export default function CertificateGenerator({ playerState, gameRules }) {
  const certificateRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      // Lebar asli sertifikat adalah 1123, ditambah sedikit padding luar
      const availableWidth = window.innerWidth - 40;
      if (availableWidth < 1123) {
        setScale(availableWidth / 1123);
      } else {
        setScale(1);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = certificateRef.current;
      // Gunakan html2canvas untuk memotret elemen
      const canvas = await html2canvas(element, {
        scale: 2, // Resolusi tinggi
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      // A4 Landscape: 297 x 210 mm
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Sertifikat_ChemQuest_${playerState.profile.name}.pdf`);

    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat mengunduh sertifikat.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mencari nama badge dari ID
  const earnedBadgeDetails = Array.from(playerState.earnedBadges).map(badgeId => {
    return gameRules.badges.find(b => b.id === badgeId);
  }).filter(Boolean);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#e5e5f7', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Top Controls */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', width: '100%', maxWidth: '1123px', justifyContent: 'center' }}>
        <button
          onClick={() => fsm.transition(STATES.DASHBOARD)}
          style={{ padding: '12px 24px', fontSize: '1rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          ⬅ Kembali ke Peta
        </button>
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          style={{ padding: '12px 24px', fontSize: '1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          {isGenerating ? 'Mencetak...' : 'Unduh PDF Sertifikat'}
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '20px' }}>Pratinjau Sertifikat</p>

      {/* VISIBLE CERTIFICATE TEMPLATE */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden', paddingBottom: '40px' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: '1123px', height: '794px' }}>
          <div
            ref={certificateRef}
          style={{
            width: '1123px', // A4 landscape pixels at 96 DPI
            height: '794px',
            minWidth: '1123px',
            padding: '20px',
            boxSizing: 'border-box',
            backgroundColor: '#f4e4c1', /* Tema Kertas Tua */
            border: '25px solid #5c4033', /* Tema Kayu (Dark Brown) */
            borderRadius: '12px',
            fontFamily: "'Cinzel Decorative', serif",
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}
        >
          {/* Ornamen Tepi / Frame Dalam */}
          <div style={{ border: '4px double #2e8b57', height: '100%', padding: '40px', boxSizing: 'border-box', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>

            <h1 style={{ fontSize: '56px', color: '#5c4033', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '6px', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>Sertifikat Kehormatan</h1>
            <h2 style={{ fontSize: '28px', color: '#2e8b57', margin: '0 0 40px 0', fontWeight: 'bold', fontFamily: "'Inter', sans-serif" }}>ChemQuest: Penjelajah Pesisir Meranti</h2>

            <p style={{ fontSize: '18px', color: '#555', marginBottom: '10px' }}>Diberikan secara resmi kepada:</p>
            <h1 style={{ fontSize: '56px', color: '#007bff', margin: '0 0 40px 0', fontFamily: 'serif', fontStyle: 'italic' }}>
              {playerState.profile.name}
            </h1>

            <p style={{ fontSize: '20px', color: '#333', maxWidth: '800px', margin: '0 auto 40px auto', lineHeight: '1.5' }}>
              Atas keberhasilannya menyelesaikan seluruh misi agen rahasia dan menguasai konsep Asam-Basa (Arrhenius, Brønsted-Lowry, Indikator, dan Titrasi) dengan Skor Penguasaan akhir: <strong>{Math.round(playerState.mastery)}</strong>.
            </p>

            {earnedBadgeDetails.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '16px', color: '#666', marginBottom: '15px' }}>Lencana Kehormatan yang Diraih:</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  {earnedBadgeDetails.map((b, i) => {
                    const IconComp = LucideIcons[b.icon] || LucideIcons.Award;
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#d4af37', display: 'flex', justifyContent: 'center' }}>
                          <IconComp size={32} />
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '5px' }}>{b.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', padding: '0 50px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #333', width: '200px', marginBottom: '10px' }}></div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Direktur ChemQuest</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>{new Date().toLocaleDateString('id-ID')}</div>
                <div style={{ borderBottom: '1px solid #333', width: '200px', marginBottom: '10px' }}></div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Tanggal Penyerahan</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
