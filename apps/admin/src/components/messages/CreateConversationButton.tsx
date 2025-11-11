'use client'

export default function CreateConversationButton() {
  const handleClick = () => {
    // TODO: Implement create conversation modal
    alert('ميزة إنشاء محادثة جديدة ستكون متاحة قريباً')
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
    >
      <span>+</span>
      <span>محادثة جديدة</span>
    </button>
  )
}
