import { useState, useEffect } from 'react';
import { AutoComplete, Input } from 'antd';
import type { LookupOption } from '../api';

interface Props {
  options: LookupOption[];
  value?: number | null;
  onChange?: (id: number | null) => void;
  onAdd: (name: string) => Promise<LookupOption>;
  onTyping?: (hasUnconfirmed: boolean) => void;
  placeholder?: string;
}

export default function CreatableSelect({ options, value, onChange, onAdd, onTyping, placeholder }: Props) {
  const [inputText, setInputText] = useState(options.find((o) => o.id === value)?.name ?? '');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setInputText(options.find((o) => o.id === value)?.name ?? '');
  }, [value, options]);

  // Unconfirmed = user typed something but hasn't selected an option
  const isUnconfirmed = inputText.trim().length > 0 && (value == null);

  useEffect(() => {
    onTyping?.(isUnconfirmed);
  }, [isUnconfirmed]);

  const filtered = inputText
    ? options.filter((o) => o.name.toLowerCase().includes(inputText.toLowerCase()))
    : options;

  const hasExactMatch = options.some((o) => o.name.toLowerCase() === inputText.toLowerCase());
  const showCreate = inputText.trim().length > 0 && !hasExactMatch;

  const autoOptions = [
    ...filtered.map((o) => ({ value: String(o.id), label: o.name })),
    ...(showCreate ? [{
      value: '__create__',
      label: <span style={{ color: '#1677ff' }}>+ Создать «{inputText.trim()}»</span>,
    }] : []),
  ];

  const handleSelect = async (val: string) => {
    if (val === '__create__') {
      const trimmed = inputText.trim();
      if (!trimmed) return;
      setAdding(true);
      try {
        const result = await onAdd(trimmed);
        setInputText(result.name);
        onChange?.(result.id);
      } finally {
        setAdding(false);
      }
    } else {
      const opt = options.find((o) => String(o.id) === val);
      if (opt) {
        setInputText(opt.name);
        onChange?.(opt.id);
      }
    }
  };

  const handleBlur = () => {
    if (!inputText.trim()) {
      onChange?.(null);
      return;
    }
    const exact = options.find((o) => o.name.toLowerCase() === inputText.trim().toLowerCase());
    if (exact) {
      setInputText(exact.name);
      onChange?.(exact.id);
    } else {
      // typed text was not confirmed — reset to last valid selected value
      setInputText(options.find((o) => o.id === value)?.name ?? '');
    }
  };

  return (
    <AutoComplete
      value={inputText}
      options={autoOptions}
      status={isUnconfirmed ? 'error' : undefined}
      onChange={(text) => {
        setInputText(text);
        if (!text) onChange?.(null);
      }}
      onSelect={handleSelect}
      onBlur={handleBlur}
      disabled={adding}
    >
      <Input autoComplete="off" placeholder={placeholder} />
    </AutoComplete>
  );
}
