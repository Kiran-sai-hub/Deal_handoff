interface Props {
  stepNumber: number
  totalSteps: number
  title: string
  description: string
  children: React.ReactNode
  onNext: () => void
  onBack?: () => void
  nextLabel?: string
  loading?: boolean
}

export function SetupStep({
  stepNumber,
  totalSteps,
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel = 'Save & Continue',
  loading = false,
}: Props) {
  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Step {stepNumber} of {totalSteps}</span>
          <span className="text-sm text-gray-500">{Math.round((stepNumber / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-gray-500 mb-8">{description}</p>
        <div className="space-y-5">{children}</div>
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {onBack ? (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onNext}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {loading ? 'Saving…' : nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
