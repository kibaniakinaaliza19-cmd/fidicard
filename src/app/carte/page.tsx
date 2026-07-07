import EditorHeader from "@/components/editor/EditorHeader";
import TemplatesPanel from "@/components/editor/TemplatesPanel";
import ToolsList from "@/components/editor/ToolsList";
import PhonePreview from "@/components/editor/PhonePreview";
import RightPanel from "@/components/editor/RightPanel";
import TemplateGalleryModal from "@/components/editor/TemplateGalleryModal";
import WalletPreviewModal from "@/components/editor/WalletPreviewModal";
import PublishModal from "@/components/editor/PublishModal";

export default function CartePage() {
  return (
    <div className="flex h-full flex-col">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="no-scrollbar flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto px-6 pb-8">
          <TemplatesPanel />
          <ToolsList />
        </div>
        <PhonePreview />
        <RightPanel />
      </div>
      <TemplateGalleryModal />
      <WalletPreviewModal />
      <PublishModal />
    </div>
  );
}
