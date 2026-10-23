/**
 * SkeletonLoader - Loading placeholder for messages
 */
export default function SkeletonLoader() {
  return (
    <div className="skeleton-loader">
      <div className="skeleton-message skeleton-ai">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-content">
          <div className="skeleton-text skeleton-line"></div>
          <div className="skeleton-text skeleton-line short"></div>
        </div>
      </div>
      
      <div className="skeleton-message skeleton-user">
        <div className="skeleton-content">
          <div className="skeleton-text skeleton-line short"></div>
        </div>
        <div className="skeleton-avatar"></div>
      </div>
      
      <div className="skeleton-message skeleton-ai">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-content">
          <div className="skeleton-text skeleton-line"></div>
          <div className="skeleton-text skeleton-line"></div>
          <div className="skeleton-text skeleton-line short"></div>
        </div>
      </div>
    </div>
  );
}
