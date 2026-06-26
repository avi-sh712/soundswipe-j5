from .database import get_all_assets


def get_recommendations(liked_asset_ids: list, limit: int = 5):
    # Heavy ML deps are imported lazily so a missing/broken scikit-learn or
    # numpy in the Lambda image can never crash the whole API at import time.
    # If they aren't available, recommendations degrade gracefully to [].
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np
    except Exception as e:  # ImportError or any loader error
        print(f"Recommender disabled (ML deps unavailable): {e}")
        return []

    all_assets = get_all_assets()
    if not all_assets or not liked_asset_ids:
        return []

    corpus = [
        f"{asset.get('category', '')} {asset.get('tags', '')} {asset.get('name', '')}"
        for asset in all_assets
    ]

    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        return []

    liked_indices = [i for i, a in enumerate(all_assets) if a.get('id') in liked_asset_ids]
    if not liked_indices:
        return []

    user_profile = tfidf_matrix[liked_indices].mean(axis=0)
    similarities = cosine_similarity(np.asarray(user_profile), tfidf_matrix).flatten()

    similar_indices = similarities.argsort()[::-1]

    recommended = []
    for idx in similar_indices:
        if all_assets[idx].get('id') not in liked_asset_ids:
            recommended.append(all_assets[idx])
        if len(recommended) >= limit:
            break

    return recommended
