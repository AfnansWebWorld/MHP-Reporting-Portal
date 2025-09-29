import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models
from .database import get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Configure CryptContext with fallback schemes in case bcrypt has issues
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Explicitly set rounds
    bcrypt__ident="2b",  # Use the 2b identifier which is widely supported
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: Union[str, bytes], hashed_password: str) -> bool:
    """
    Verify a password against a hash with bcrypt's 72-byte limit handling.
    
    Args:
        plain_password: The plaintext password (string or bytes)
        hashed_password: The hashed password to check against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    # Early return if inputs are invalid
    if not plain_password or not hashed_password:
        logger.warning("Empty password or hash provided")
        return False
    
    # Simple direct approach - always truncate to 72 bytes first
    try:
        # Convert to bytes if string
        if isinstance(plain_password, str):
            password_bytes = plain_password.encode('utf-8')
        else:
            password_bytes = plain_password
            
        # Always truncate to 72 bytes before verification
        truncated_bytes = password_bytes[:72]
        
        # Convert back to string for verification
        truncated_password = truncated_bytes.decode('utf-8', errors='replace') if isinstance(plain_password, str) else truncated_bytes
        
        # Try direct verification with truncated password
        try:
            # First attempt with standard verification
            return pwd_context.verify(truncated_password, hashed_password)
        except Exception as e1:
            logger.warning(f"Standard verification failed: {e1}")
            
            # Second attempt with explicit scheme
            try:
                return pwd_context.verify(truncated_password, hashed_password, scheme="bcrypt")
            except Exception as e2:
                logger.warning(f"Explicit scheme verification failed: {e2}")
                
                # Last resort - try with different encoding
                try:
                    if isinstance(plain_password, str):
                        # Try ASCII encoding as last resort
                        ascii_password = plain_password.encode('ascii', errors='ignore')[:72].decode('ascii', errors='ignore')
                        return pwd_context.verify(ascii_password, hashed_password)
                except Exception:
                    pass
                
                return False
    except Exception as e:
        logger.error(f"Password verification completely failed: {e}")
        return False


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        
        if user_id_str is None:
            print("Token missing 'sub' claim")
            raise credentials_exception
            
        try:
            user_id = int(user_id_str)
        except ValueError:
            print(f"Invalid user ID format in token: {user_id_str}")
            raise credentials_exception
            
        # Query the user from database
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if user is None:
            print(f"User with ID {user_id} not found in database")
            raise credentials_exception
            
        return user
        
    except JWTError as e:
        print(f"JWT validation error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in authentication: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication"
        )


def require_admin(user: models.User = Depends(get_current_user)):
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


def get_current_active_user(user: models.User = Depends(get_current_user)):
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_admin_user(user: models.User = Depends(get_current_user)):
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


def check_outstation_access(user: models.User = Depends(get_current_active_user)):
    if not user.has_outstation_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to Out Station Expense feature"
        )
    return user