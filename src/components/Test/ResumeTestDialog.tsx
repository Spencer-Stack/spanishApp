import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';

interface ResumeTestDialogProps {
  remaining: number;
  onContinue: () => void;
  onNewTest: () => void;
  onCancel: () => void;
}

/** Shown instead of jumping straight to Test Setup when a test was left
 * paused (Escape mid-test) — lets you pick up exactly where you left off,
 * or discard it and configure a fresh one. */
export function ResumeTestDialog({ remaining, onContinue, onNewTest, onCancel }: ResumeTestDialogProps) {
  return (
    <Modal onClose={onCancel} width={380}>
      <ModalHeader
        title="Resume test?"
        subtitle={`You paused a test with ${remaining} card${remaining === 1 ? '' : 's'} left.`}
      />
      <ModalFooter>
        <Button variant="secondary" onClick={onNewTest}>
          New Test
        </Button>
        <Button variant="primary" onClick={onContinue} autoFocus>
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  );
}
