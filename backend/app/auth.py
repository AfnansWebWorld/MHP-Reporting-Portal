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
    bcrypt__ident="2b"  # Explicitly set ident to avoid version detection
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: Union[str, bytes], hashed_password: str) -> bool:
    """
    Custom password verification that bypasses passlib's bcrypt implementation issues.
    
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
    
    try:
        logger.info("Using direct password verification method")
        
        # Convert to bytes if string and truncate to 72 bytes
        if isinstance(plain_password, str):
            password_bytes = plain_password.encode('utf-8')[:72]
        else:
            password_bytes = plain_password[:72]
        
        # For bcrypt hashes (starting with $2)
        if hashed_password.startswith('$2'):
            try:
                # Try to use bcrypt directly, bypassing passlib
                import bcrypt
                
                # Extract the salt from the hash
                # bcrypt hash format: $2b$rounds$salt+hash
                parts = hashed_password.split('$')
                if len(parts) >= 4:
                    # Use the hash directly with bcrypt
                    try:
                        result = bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
                        logger.info("Direct bcrypt verification successful")
                        return result
                    except Exception as e:
                        logger.warning(f"Direct bcrypt verification failed: {e}")
            except ImportError:
                logger.warning("bcrypt module not available")
        
        # Try passlib verification with error handling
        try:
            # Try verification with passlib
            if isinstance(plain_password, str):
                truncated_password = password_bytes.decode('utf-8', errors='replace')
            else:
                truncated_password = password_bytes
                
            result = pwd_context.verify(truncated_password, hashed_password)
            logger.info(f"Passlib verification result: {result}")
            return result
        except Exception as e:
            logger.warning(f"Passlib verification failed: {e}")
            
            # Last resort - try a different approach for bcrypt hashes
            if hashed_password.startswith('$2'):
                try:
                    # Try with a different bcrypt library if available
                    import py_bcrypt
                    result = py_bcrypt.verify(password_bytes, hashed_password.encode('utf-8'))
                    logger.info("py_bcrypt verification successful")
                    return result
                except (ImportError, Exception) as e:
                    logger.warning(f"py_bcrypt verification failed: {e}")
            
            return False
    except Exception as e:
        logger.error(f"Password verification completely failed: {e}")
        return False


def get_password_hash(password):
    """Hash a password using bcrypt (max 72 bytes)"""
    try:
        if not password:
            raise ValueError("Password cannot be empty")
        
        # Ensure password is a string
        if isinstance(password, bytes):
            password = password.decode('utf-8')
        
        password_str = str(password).strip()
        
        if not password_str:
            raise ValueError("Password cannot be empty after stripping whitespace")
        
        # Bcrypt has a 72-byte limit, truncate if necessary
        password_bytes = password_str.encode('utf-8')
        if len(password_bytes) > 72:
            logger.warning(f"Password is {len(password_bytes)} bytes, truncating to 72 bytes for bcrypt")
            password_bytes = password_bytes[:72]
            password_str = password_bytes.decode('utf-8', errors='ignore')
            password_bytes = password_str.encode('utf-8')

        # Prefer native bcrypt implementation for stability
        try:
            import bcrypt

            # Use consistent rounds across hash/verify
            salt = bcrypt.gensalt(rounds=12)
            hashed_bytes = bcrypt.hashpw(password_bytes, salt)
            hashed_str = hashed_bytes.decode('utf-8')
            logger.info(
                "Password hashed successfully with bcrypt (length: %s chars, %s bytes)",
                len(password_str),
                len(password_bytes)
            )
            return hashed_str
        except ImportError:
            logger.warning("bcrypt module not available, falling back to passlib context")
        except Exception as bcrypt_error:
            logger.error(f"Native bcrypt hashing failed: {bcrypt_error}. Falling back to passlib context.")
        
        hashed = pwd_context.hash(password_str)
        logger.info(
            "Password hashed successfully with passlib (length: %s chars, %s bytes)",
            len(password_str),
            len(password_bytes)
        )
        return hashed
    except ValueError as e:
        # Re-raise ValueError as-is
        logger.error(f"Password validation failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Password hashing failed: {e}")
        raise ValueError(f"Failed to hash password: {str(e)}")


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
            detail="User does not have access to the TADA expense feature"
        )
    return user