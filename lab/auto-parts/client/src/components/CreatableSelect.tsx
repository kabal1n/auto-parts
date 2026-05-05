import { AutoComplete } from 'antd';

interface Props {
  options: string[];
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export default function CreatableSelect({ options, value, onChange, placeholder }: Props) {
  const typed = value ?? '';

  const filtered = typed
    ? options.filter((o) => o.toLowerCase().includes(typed.toLowerCase()))
    : options;

  const hasExactMatch = options.some((o) => o.toLowerCase() === typed.toLowerCase());
  const showCreate = typed.length > 0 && !hasExactMatch;

  const autoOptions = [
    ...filtered.map((o) => ({ value: o, label: o })),
    ...(showCreate ? [{
      value: typed,
      label: <span style={{ color: '#1677ff' }}>+ Создать «{typed}»</span>,
    }] : []),
  ];

  return (
    <AutoComplete
      value={value}
      options={autoOptions}
      onChange={onChange}
      placeholder={placeholder}
      filterOption={false}
    />
  );
}
