import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { type Fuda, SpiritType } from "../../types";

type FormMode = "create" | "edit";

interface FormData {
  id?: string;
  title: string;
  description: string;
  spiritType: SpiritType;
  priority: number;
}

interface FudaFormProps {
  mode: FormMode;
  fuda?: Fuda;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}

const SPIRIT_TYPES: SpiritType[] = [
  SpiritType.SHIKIGAMI,
  SpiritType.TENGU,
  SpiritType.KITSUNE,
];

const FIELD_COUNT = 5; // title, description, spirit, priority, submit

export function FudaForm({ mode, fuda, onSubmit, onCancel }: FudaFormProps) {
  const [focusedField, setFocusedField] = useState(0);
  const [title, setTitle] = useState(fuda?.title ?? "");
  const [description, setDescription] = useState(fuda?.description ?? "");
  const [spiritType, setSpiritType] = useState<SpiritType>(
    fuda?.spiritType ?? SpiritType.SHIKIGAMI
  );
  const [priority, setPriority] = useState(fuda?.priority ?? 5);
  const [error, setError] = useState<string | null>(null);

  // Refs for synchronous access
  const focusedFieldRef = useRef(0);
  const titleRef = useRef(fuda?.title ?? "");
  const descriptionRef = useRef(fuda?.description ?? "");
  const spiritTypeRef = useRef<SpiritType>(fuda?.spiritType ?? SpiritType.SHIKIGAMI);
  const priorityRef = useRef(fuda?.priority ?? 5);

  const handleSubmit = () => {
    const trimmedTitle = titleRef.current.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    const data: FormData = {
      title: trimmedTitle,
      description: descriptionRef.current.trim(),
      spiritType: spiritTypeRef.current,
      priority: priorityRef.current,
    };

    if (mode === "edit" && fuda) {
      data.id = fuda.id;
    }

    onSubmit(data);
  };

  useInput((input, key) => {
    // Clear error when typing
    if (error && focusedFieldRef.current === 0 && input.length > 0) {
      setError(null);
    }

    // Handle escape
    if (key.escape) {
      onCancel?.();
      return;
    }

    // Handle tab navigation
    if (key.tab) {
      if (key.shift) {
        focusedFieldRef.current = (focusedFieldRef.current - 1 + FIELD_COUNT) % FIELD_COUNT;
      } else {
        focusedFieldRef.current = (focusedFieldRef.current + 1) % FIELD_COUNT;
      }
      setFocusedField(focusedFieldRef.current);
      return;
    }

    // Handle enter
    if (key.return) {
      handleSubmit();
      return;
    }

    // Handle field-specific input
    switch (focusedFieldRef.current) {
      case 0: // Title
        if (key.backspace || key.delete) {
          titleRef.current = titleRef.current.slice(0, -1);
          setTitle(titleRef.current);
        } else if (input && !key.ctrl && !key.meta) {
          titleRef.current = titleRef.current + input;
          setTitle(titleRef.current);
          if (error) setError(null);
        }
        break;

      case 1: // Description
        if (key.backspace || key.delete) {
          descriptionRef.current = descriptionRef.current.slice(0, -1);
          setDescription(descriptionRef.current);
        } else if (input && !key.ctrl && !key.meta) {
          descriptionRef.current = descriptionRef.current + input;
          setDescription(descriptionRef.current);
        }
        break;

      case 2: // Spirit Type
        if (key.leftArrow || input === "h") {
          const currentIndex = SPIRIT_TYPES.indexOf(spiritTypeRef.current);
          const newIndex =
            (currentIndex - 1 + SPIRIT_TYPES.length) % SPIRIT_TYPES.length;
          spiritTypeRef.current = SPIRIT_TYPES[newIndex];
          setSpiritType(spiritTypeRef.current);
        } else if (key.rightArrow || input === "l") {
          const currentIndex = SPIRIT_TYPES.indexOf(spiritTypeRef.current);
          const newIndex = (currentIndex + 1) % SPIRIT_TYPES.length;
          spiritTypeRef.current = SPIRIT_TYPES[newIndex];
          setSpiritType(spiritTypeRef.current);
        }
        break;

      case 3: // Priority
        if (key.leftArrow || input === "h") {
          priorityRef.current = Math.max(1, priorityRef.current - 1);
          setPriority(priorityRef.current);
        } else if (key.rightArrow || input === "l") {
          priorityRef.current = Math.min(10, priorityRef.current + 1);
          setPriority(priorityRef.current);
        } else if (input && /^\d$/.test(input)) {
          const num = parseInt(input, 10);
          if (num >= 1 && num <= 10) {
            priorityRef.current = num;
            setPriority(num);
          }
        }
        break;
    }
  });

  const renderField = (
    label: string,
    value: string,
    fieldIndex: number,
    hint?: string
  ) => {
    const isFocused = focusedField === fieldIndex;
    return (
      <Box flexDirection="row" gap={1}>
        <Text bold={isFocused} color={isFocused ? "cyan" : undefined}>
          {label}:
        </Text>
        <Text>
          {value}
          {isFocused && <Text color="cyan">_</Text>}
        </Text>
        {hint && isFocused && <Text dimColor>({hint})</Text>}
      </Box>
    );
  };

  const submitLabel = mode === "create" ? "Create" : "Update";
  const isSubmitFocused = focusedField === FIELD_COUNT - 1;

  return (
    <Box flexDirection="column" gap={1}>
      {renderField("Title", title, 0)}
      {renderField("Description", description, 1)}

      <Box flexDirection="row" gap={1}>
        <Text
          bold={focusedField === 2}
          color={focusedField === 2 ? "cyan" : undefined}
        >
          Spirit:
        </Text>
        <Text>{spiritType}</Text>
        {focusedField === 2 && <Text dimColor>(use arrows to change)</Text>}
      </Box>

      <Box flexDirection="row" gap={1}>
        <Text
          bold={focusedField === 3}
          color={focusedField === 3 ? "cyan" : undefined}
        >
          Priority:
        </Text>
        <Text>{priority}</Text>
        {focusedField === 3 && <Text dimColor>(1-10, use arrows)</Text>}
      </Box>

      <Box marginTop={1}>
        <Text
          bold={isSubmitFocused}
          color={isSubmitFocused ? "green" : "cyan"}
          inverse={isSubmitFocused}
        >
          [{submitLabel}]
        </Text>
        <Text dimColor> Press Enter to submit, Esc to cancel</Text>
      </Box>

      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
