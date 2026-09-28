import { Modal, ModalFooter, ModalHeader } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} width={380}>
      <ModalHeader title={title} />
      <div className="px-5 py-4 text-[12.5px] text-neutral-600">{message}</div>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
