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

        # 3.5. Verification: Check that history is truly gone (as requested)
        # We verify that no matches in this club contain the guest_id anymore.
        
        verify_q1 = matches_ref.where(filter=firestore.FieldFilter("clubId", "==", club_id))\
                               .where(filter=firestore.FieldFilter("team1", "array_contains", guest_id))\
                               .limit(1).get()
                               
        verify_q2 = matches_ref.where(filter=firestore.FieldFilter("clubId", "==", club_id))\
                               .where(filter=firestore.FieldFilter("team2", "array_contains", guest_id))\
                               .limit(1).get()

        if len(verify_q1) > 0 or len(verify_q2) > 0:
            print(f"Verification Failed: Guest {guest_id} still exists in matches after merge attempt.")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.DATA_LOSS,
                message="Merge verification failed: Guest history was not fully migrated. Guest not deleted."
            )

        print("Verification Successful: Guest history migrated.")

        # 4. Remove guest from Club's guestPlayers list (Permanent Deletion)
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
                    print(f"PERMANENT DELETION: Successfully removed guest {guest_id} from club {club_id}")
                else:
                    print(f"WARNING: Guest {guest_id} was not found in the club roster. Deletion skipped.")
            else:
                print(f"ERROR: Club {club_id} not found during guest deletion.")
                
        except Exception as e:
            # If deletion fails, we define this as a critical failure for the operation
            print(f"CRITICAL ERROR merging guest history - failed to delete guest: {e}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INTERNAL,
                message="History migrated, but failed to permanently delete guest from roster."
            )

        return {"success": True, "updatedMatches": update_count}

    except Exception as e:
        print(f"Error merging guest history: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Unable to merge guest history."
        )
