
import React, { useState, useEffect, useRef } from "react";

interface DikteCepatProps {
  onSave: (data: {
    kehadiran: string;
    tanggal: string;
    jamMulai: string;
    uraianPekerjaan: string;
  }) => Promise<void> | void;
}

export default function DikteCepat({ onSave }: DikteCepatProps) {
  const [uraian, setUraian] = useState("");
  const [mendengarkan, setMendengarkan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const recognitionRef = useRef<any>(null);

  const sekarang = new Date();

  const tanggal = sekarang.toLocaleDateString("en-CA");
  const jam = sekarang.toTimeString().slice(0, 5);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let hasilFinal = "";
      let hasilSementara = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const teks = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          hasilFinal += teks + " ";
        } else {
          hasilSementara += teks;
        }
      }

      if (hasilFinal) {
        setUraian((prev) =>
          (prev + " " + hasilFinal).trim()
        );
      }

      // Hasil sementara ditampilkan terpisah
      setSementara(hasilSementara);
    };

    recognition.onend = () => {
      setMendengarkan(false);
    };

    recognition.onerror = () => {
      setMendengarkan(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const [sementara, setSementara] = useState("");

  const mulaiDikte = () => {
    if (!recognitionRef.current) {
      alert(
        "Browser ini belum mendukung dikte otomatis. Gunakan dikte keyboard iPhone."
      );
      return;
    }

    try {
      recognitionRef.current.start();
      setMendengarkan(true);
    } catch {
      setMendengarkan(false);
    }
  };

  const berhentiDikte = () => {
    recognitionRef.current?.stop();
    setMendengarkan(false);
  };

  const simpanKegiatan = async () => {
    if (!uraian.trim()) {
      alert("Silakan isi rincian pekerjaan terlebih dahulu.");
      return;
    }

    setMenyimpan(true);

    try {
      await onSave({
        kehadiran: "WFO",
        tanggal,
        jamMulai: jam,
        uraianPekerjaan: uraian.trim(),
      });

      setUraian("");
      setSementara("");

      alert("Kegiatan berhasil disimpan.");
    } catch (error) {
      alert("Gagal menyimpan kegiatan.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">

      <h2 className="text-xl font-bold">
        Dikte Cepat Logbook
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-100 p-3 rounded-xl">
          <small>Kehadiran</small>
          <p className="font-bold text-green-700">WFO</p>
        </div>

        <div className="bg-gray-100 p-3 rounded-xl">
          <small>Jam mulai</small>
          <p className="font-bold">{jam}</p>
        </div>
      </div>

      <div>
        <label className="font-semibold">
          Tanggal
        </label>

        <input
          type="date"
          value={tanggal}
          readOnly
          className="w-full border rounded-xl p-3 mt-1"
        />
      </div>

      <div>
        <label className="font-semibold">
          Rincian Kinerja
        </label>

        <textarea
          value={uraian}
          onChange={(e) => setUraian(e.target.value)}
          placeholder="Tekan mikrofon dan ucapkan rincian pekerjaan..."
          rows={6}
          className="w-full border rounded-xl p-3 mt-2"
        />

        {sementara && (
          <p className="text-sm text-gray-500 mt-1">
            Sedang mengenali: {sementara}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={
          mendengarkan ? berhentiDikte : mulaiDikte
        }
        className={`w-full rounded-xl p-4 text-white font-bold ${
          mendengarkan ? "bg-red-600" : "bg-blue-600"
        }`}
      >
        {mendengarkan
          ? "■ Berhenti Dikte"
          : "🎙 Mulai Dikte"}
      </button>

      <button
        type="button"
        onClick={simpanKegiatan}
        disabled={menyimpan}
        className="w-full bg-green-700 text-white rounded-xl p-4 font-bold disabled:opacity-50"
      >
        {menyimpan ? "Menyimpan..." : "Simpan Kegiatan"}
      </button>

    </div>
  );
}
