from firebase_functions import https_fn
from firebase_admin import initialize_app, firestore
import google.cloud.firestore

# Initialize Firebase Admin
initialize_app()

@https_fn.on_call()
def merge_guest_history(req: https_fn.CallableRequest) -> dict:
    """
    Merges a Guest Player's match history into a Real User's account.
    """
    # 1. Authentication Check
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="The function must be called while authenticated."
        )

    # 2. Extract Data
    data = req.data
    club_id = data.get("clubId")
    guest_id = data.get("guestId")
    real_user_id = data.get("realUserId")

    if not club_id or not guest_id or not real_user_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="The function must be called with clubId, guestId, and realUserId."
        )

    print(f"Starting merge: Guest {guest_id} -> User {real_user_id} in Club {club_id}")

    try:
        db = firestore.client()
        matches_ref = db.collection("matches")
        
        # 3. Query all matches for the club
        # Using simple equality filter
        query = matches_ref.where(filter=firestore.FieldFilter("clubId", "==", club_id))
        docs = query.stream()

        batch = db.batch()
        update_count = 0
        
        # Helper to replace ID in list
        def replace_id(arr):
            if not arr: return []
            return [real_user_id if x == guest_id else x for x in arr]

        for doc in docs:
            match_data = doc.to_dict()
            needs_update = False
            
            # Check Team 1
            team1 = match_data.get("team1", [])
            if team1 and guest_id in team1:
                new_team1 = replace_id(team1)
                batch.update(doc.reference, {"team1": new_team1})
                needs_update = True
                
            # Check Team 2
            team2 = match_data.get("team2", [])
            if team2 and guest_id in team2:
                # If team1 was improved, we must include it if needed
                new_team1 = replace_id(match_data.get("team1", []))
                new_team2 = replace_id(team2)
                
                batch.update(doc.reference, {
                    "team1": new_team1,
                    "team2": new_team2
                })
                needs_update = True
            
            if needs_update:
                update_count += 1
                # Batches have a limit of 500 ops. Commit if getting full.
                if update_count % 400 == 0:
                    batch.commit()
                    batch = db.batch()

        # Commit remaining
        if update_count > 0:
            batch.commit()

        print(f"Successfully merged {update_count} matches.")

        # 4. Remove guest from Club's guestPlayers list
        try:
            club_ref = db.collection("clubs").document(club_id)
            club_snap = club_ref.get()
            if club_snap.exists:
                club_data = club_snap.to_dict()
                guests = club_data.get("guestPlayers", [])
                
                # Filter out the merged guest
                new_guests = [g for g in guests if g.get("id") != guest_id]
                
                if len(guests) != len(new_guests):
                    club_ref.update({"guestPlayers": new_guests})
                    print(f"Removed guest {guest_id} from club {club_id}")
        except Exception as e:
            print(f"Error removing guest record: {e}")
            # Don't fail the whole function if this part fails, as data is already merged
            pass

        return {"success": True, "updatedMatches": update_count}

    except Exception as e:
        print(f"Error merging guest history: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Unable to merge guest history."
        )
