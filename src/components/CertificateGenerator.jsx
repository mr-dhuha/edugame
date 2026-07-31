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
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
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
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden', paddingBottom: '40px' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: '1123px', height: '794px' }}>
          <div
            ref={certificateRef}
            style={{
              width: '1123px',
              height: '794px',
              backgroundColor: '#fff', 
              border: '10px solid #2e8b57',
              borderRadius: '8px',
              fontFamily: "'Inter', sans-serif",
              position: 'relative',
              boxSizing: 'border-box',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Stamp Logo Watermark / Corner */}
            <img src="/img/logo.png" alt="Stamp" style={{ position: 'absolute', right: '60px', bottom: '60px', width: '150px', opacity: 0.9 }} />

            <h1 style={{ fontSize: '48px', color: '#2e8b57', margin: '0 0 10px 0', textTransform: 'uppercase', fontFamily: "'Cinzel Decorative', serif" }}>Sertifikat Penguasaan</h1>
            <p style={{ fontSize: '18px', color: '#555', marginBottom: '30px' }}>Diberikan kepada:</p>
            
            <h2 style={{ fontSize: '42px', color: '#333', margin: '0 0 20px 0', borderBottom: '2px solid #2e8b57', paddingBottom: '10px', minWidth: '400px', textAlign: 'center' }}>
              {playerState.profile.name}
            </h2>

            <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px', textAlign: 'center', maxWidth: '800px', lineHeight: '1.5' }}>
              Telah menyelesaikan misi ChemQuest: Pesisir Meranti dengan tingkat keberhasilan (Mastery) sebesar <strong>{Math.round(playerState.mastery)}</strong>.<br/>
              Berikut adalah pemetaan kognitif (Taksonomi Bloom) per episode yang diraih siswa:
            </p>

            {/* Radar Charts Grid */}
            <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', flexWrap: 'wrap', flex: 1 }}>
              {episodeRadars.map((radar, idx) => (
                <div key={idx} style={{ 
                  width: '23%', 
                  textAlign: 'center', 
                  opacity: radar.hasData ? 1 : 0.5, 
                  filter: radar.hasData ? 'none' : 'grayscale(100%)' 
                }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '16px' }}>Episode {radar.episode}</h4>
                  <div style={{ height: '220px', width: '100%' }}>
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
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 'auto', padding: '0 40px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #333', width: '200px', marginBottom: '10px' }}></div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Pembimbing / Guru</p>
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
  );
}
