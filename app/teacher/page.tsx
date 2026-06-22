'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cls { id: number; name: string }

export default function TeacherHome() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/classes').then(r => r.json()).then(setClasses);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Class</h2>
      <p className="text-gray-500 text-sm mb-6">Choose a class to mark or review attendance.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {classes.map(cls => {
          const isSisters = cls.name.toLowerCase().includes('sister');
          const isBrothers = cls.name.toLowerCase().includes('brother');
          const cardBg = isBrothers ? '#dbeafe' : isSisters ? '#fce7f3' : '#ffffff';
          const iconBg = isBrothers ? '#bfdbfe' : isSisters ? '#fbcfe8' : '#f0f4ff';
          return (
            <button
              key={cls.id}
              onClick={() => router.push(`/teacher/attendance?class_id=${cls.id}&date=${today}`)}
              className="flex items-center gap-4 rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-[#C9973A] transition-all group"
              style={{ background: cardBg }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: iconBg }}>
                📋
              </div>
              <div>
                <div className="font-semibold text-gray-800 group-hover:text-[#1B2F5E]">{cls.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">Tap to mark attendance</div>
              </div>
              <span className="ml-auto text-gray-300 group-hover:text-[#C9973A] text-xl">›</span>
            </button>
          );
        })}

        {classes.length === 0 && (
          <p className="text-gray-400 col-span-2 text-center py-12">No classes have been created yet. Ask the admin to add classes.</p>
        )}
      </div>
    </div>
  );
}
