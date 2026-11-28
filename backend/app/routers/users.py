from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserOut, UserUpdate
from backend.app.services.auth import get_current_user

router = APIRouter(prefix="/users", tags = ["users"])

#----------return current user---------

@router.get("/me",response_model = UserOut)
def user_display(current_user :User=Depends(get_current_user)):
    if current_user:
        return current_user
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

#-------Update user name ---------

@router.patch("/me", response_model=UserOut)
def user_update(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user :User=Depends(get_current_user)
):
    if payload.name is not None:
        current_user.name = payload.name
    db.commit()
    db.refresh(current_user)
    return current_user 
    
