import React, { useRef, useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft } from 'lucide-react';
import { fsm, STATES } from '../core/FSMEngine';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import questionsData from '../data/questions.json';

export default function CertificateGenerator({ playerState, gameRules }) {
  const certificateRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
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
    // Beri waktu browser untuk re-render tanpa scale sebelum di-capture
    await new Promise(r => setTimeout(r, 100));
    
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Tetap menggunakan scale 2 untuk resolusi tinggi
        backgroundColor: '#ffffff'
      });

      // Menggunakan JPEG dengan kualitas 0.9 (90%) untuk kompresi maksimal (ukuran ~500kb - 1MB)
      // Jauh lebih efisien daripada PNG yang bisa mencapai 10MB
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Sertifikat_ChemQuest_${playerState.profile.name}.pdf`);

    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat mengunduh sertifikat.");
    } finally {
      setIsGenerating(false);
    }
  };

  const episodeRadars = useMemo(() => {
    const bloomMap = {};
    questionsData.forEach(q => {
      if (q.id && q.bloom) bloomMap[q.id] = q.bloom;
    });

    const bloomLabels = { C1: 'C1', C2: 'C2', C3: 'C3', C4: 'C4', C5: 'C5', C6: 'C6' };
    const radars = [];

    for (let i = 1; i <= 4; i++) {
      const epStats = playerState.episodeStats[i];
      const bloomCounts = { C1: { total: 0, correct: 0 }, C2: { total: 0, correct: 0 }, C3: { total: 0, correct: 0 }, C4: { total: 0, correct: 0 }, C5: { total: 0, correct: 0 }, C6: { total: 0, correct: 0 } };
      let hasData = false;

      if (epStats && epStats.results) {
        epStats.results.forEach(res => {
          const b = bloomMap[res.questionId];
          if (b && bloomCounts[b]) {
            bloomCounts[b].total++;
            hasData = true;
            if (res.isCorrect) bloomCounts[b].correct++;
          }
        });
      }

      const data = Object.keys(bloomCounts).map(lvl => {
        const b = bloomCounts[lvl];
        const rate = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
        return { subject: bloomLabels[lvl], A: rate };
      });

      radars.push({
        episode: i,
        hasData,
        data
      });
    }
    return radars;
  }, [playerState.episodeStats]);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#e5e5f7', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Top Controls */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', width: '100%', maxWidth: '1123px', justifyContent: 'center' }}>
        <button
          onClick={() => fsm.transition(STATES.DASHBOARD)}
          style={{ padding: '12px 24px', fontSize: '1rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={20} /> Kembali ke Peta
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
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden', paddingBottom: '40px', height: isGenerating ? 'auto' : 794 * scale + 40 }}>
        <div style={{ transform: `scale(${isGenerating ? 1 : scale})`, transformOrigin: 'top center', width: '1123px', height: '794px', minWidth: '1123px', flexShrink: 0 }}>
          <div
            ref={certificateRef}
            style={{
              width: '1123px',
              height: '794px',
              minWidth: '1123px',
              minHeight: '794px',
              backgroundColor: '#fff',
              border: '10px solid #2e8b57',
              borderRadius: '8px',
              fontFamily: "'Inter', sans-serif",
              position: 'relative',
              boxSizing: 'border-box',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            {/* Ornamen Latar Belakang (Watermark Tiled) */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'url(/img/logo.png)',
              backgroundSize: '150px',
              backgroundRepeat: 'repeat',
              opacity: 0.04,
              pointerEvents: 'none',
              zIndex: 0
            }} />

            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
              <h1 style={{ fontSize: '48px', color: '#2e8b57', margin: '0 0 10px 0', textTransform: 'uppercase', fontFamily: "'Cinzel Decorative', serif" }}>Sertifikat Penguasaan</h1>
              <p style={{ fontSize: '18px', color: '#555', marginBottom: '30px' }}>Diberikan kepada:</p>
              
              <h2 style={{ fontSize: '42px', color: '#333', margin: '0 0 20px 0', borderBottom: '2px solid #2e8b57', paddingBottom: '10px', minWidth: '400px', textAlign: 'center' }}>
                {playerState.profile.name}
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px', textAlign: 'center', maxWidth: '800px', lineHeight: '1.5' }}>
                Telah menyelesaikan misi ChemQuest: Pesisir Meranti yang diselenggarakan pada <strong>4 Agustus 2026</strong> dengan pencapaian <strong>Skor Kemampuan Kognitif sebesar {Math.round(playerState.mastery)}/{gameRules?.mastery?.maxValue || 100}</strong>.<br/>
                Berikut adalah pemetaan kognitif (Taksonomi Bloom) per episode yang diraih siswa:
              </p>

              {/* Bloom's Taxonomy Legend */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px', fontSize: '13px', color: '#555', maxWidth: '900px', background: '#f8f9fa', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2d3b3' }}>
                <span><strong>C1:</strong> Mengingat</span>
                <span><strong>C2:</strong> Memahami</span>
                <span><strong>C3:</strong> Mengaplikasikan</span>
                <span><strong>C4:</strong> Menganalisis</span>
                <span><strong>C5:</strong> Mengevaluasi</span>
                <span><strong>C6:</strong> Mencipta</span>
              </div>

              {/* Radar Charts Grid */}
              <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', flexWrap: 'wrap', flex: 1 }}>
                {episodeRadars.map((radar, idx) => {
                  const episodeNames = {
                    1: "Jejak Teori Asam-Basa",
                    2: "Operasi Derajat Keasaman",
                    3: "Detektif Warna Laboratorium",
                    4: "Titrasi Sang Penyelamat"
                  };
                  return (
                    <div key={idx} style={{ 
                      width: '23%', 
                      textAlign: 'center', 
                      opacity: radar.hasData ? 1 : 0.5, 
                      filter: radar.hasData ? 'none' : 'grayscale(100%)' 
                    }}>
                      <h4 style={{ margin: '0 0 2px 0', color: '#2e8b57', fontSize: '15px' }}>Episode {radar.episode}</h4>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', height: '16px' }}>{episodeNames[radar.episode]}</div>
                      <div style={{ height: '200px', width: '100%' }}>
                        <ResponsiveContainer>
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radar.data}>
                            <PolarGrid stroke="#e2d3b3" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#333' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                            <Radar name={`Ep ${radar.episode}`} dataKey="A" stroke={radar.hasData ? "#2e8b57" : "#999"} fill={radar.hasData ? "#2e8b57" : "#999"} fillOpacity={0.4} isAnimationActive={false} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      {!radar.hasData && <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>Belum diselesaikan</span>}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 'auto', padding: '0 40px' }}>
                
                {/* Logo Kiri Bawah */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', width: '250px' }}>
                  <img src="/img/logo.png" alt="ChemQuest" style={{ width: '140px', marginBottom: '10px' }} />
                </div>

                {/* Tanda Tangan Tengah dengan Stempel */}
                <div style={{ textAlign: 'center', width: '250px', position: 'relative' }}>
                  {/* Stempel (Wet Stamp) */}
                  <img src="/img/stamp.png" alt="Stamp" style={{ position: 'absolute', top: '-40px', left: '-20px', width: '110px', opacity: 0.85, zIndex: 3, transform: 'rotate(-15deg)' }} />
                  {/* Gambar TTD */}
                  <img src="/img/signature.png" alt="Signature" style={{ height: '100px', marginBottom: '-20px', position: 'relative', zIndex: 2 }} />
                  
                  <div style={{ borderBottom: '2px solid #2e8b57', width: '100%', marginBottom: '10px', position: 'relative', zIndex: 1 }}></div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Siti Nazhifah, M.Pd</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Chemquest Director</p>
                </div>

                {/* Spacer Kanan (Untuk menyeimbangkan Logo di Kiri dan TTD di Tengah) */}
                <div style={{ width: '250px' }}></div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
